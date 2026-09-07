import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Redis } from 'ioredis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import { ConfigService } from '@nestjs/config';
import { ExamStatus } from '@prisma/client';

import { STORAGE_CLIENT } from '../storage/storage.module';

export interface BulkMarksDto {
  subjectId: string;
  marks: {
    studentId: string;
    marksObtained: number;
    remarks?: string;
  }[];
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    @Inject(STORAGE_CLIENT) private readonly s3Client: S3Client
  ) {}

  async saveMarks(branchId: string, examId: string, payload: BulkMarksDto) {
    const subject = await this.prisma.examSubject.findUnique({
      where: { id: payload.subjectId }
    });
    
    if (!subject || subject.examId !== examId) {
      throw new BadRequestException('Invalid subject for this exam.');
    }

    // Validate marks
    for (const record of payload.marks) {
      if (record.marksObtained < 0 || record.marksObtained > subject.maxMarks) {
        throw new BadRequestException(`Marks for student ${record.studentId} exceed maximum allowed (${subject.maxMarks}).`);
      }
    }

    await this.prisma.$transaction(
      payload.marks.map(record =>
        this.prisma.examResult.upsert({
          where: {
            studentId_subjectId: {
              studentId: record.studentId,
              subjectId: payload.subjectId,
            }
          },
          create: {
            examId,
            studentId: record.studentId,
            subjectId: payload.subjectId,
            marksObtained: record.marksObtained,
            remarks: record.remarks,
          },
          update: {
            marksObtained: record.marksObtained,
            remarks: record.remarks,
          }
        })
      )
    );

    return { success: true, count: payload.marks.length };
  }

  async calculateRankings(branchId: string, examId: string) {
    const cacheKey = `exam_rankings:${branchId}:${examId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, branchId },
      include: { subjects: true }
    });

    if (!exam) throw new NotFoundException('Exam not found');

    const results = await this.prisma.examResult.findMany({
      where: { examId },
      include: { subject: true, student: true }
    });

    // Group by student
    const studentAggregates: Record<string, { total: number, name: string }> = {};
    
    results.forEach(r => {
      if (!studentAggregates[r.studentId]) {
        studentAggregates[r.studentId] = { total: 0, name: `${r.student.firstName} ${r.student.lastName}` };
      }
      studentAggregates[r.studentId].total += r.marksObtained;
    });

    const students = Object.values(studentAggregates).sort((a, b) => b.total - a.total);
    
    let highest = 0;
    let lowest = exam.totalMarks;
    let totalSum = 0;

    students.forEach((s, idx) => {
      highest = Math.max(highest, s.total);
      lowest = Math.min(lowest, s.total);
      totalSum += s.total;
    });

    const average = students.length > 0 ? (totalSum / students.length) : 0;
    
    // Sort array to find median
    const sortedTotals = students.map(s => s.total).sort((a, b) => a - b);
    const mid = Math.floor(sortedTotals.length / 2);
    const median = sortedTotals.length % 2 !== 0 ? sortedTotals[mid] : ((sortedTotals[mid - 1] + sortedTotals[mid]) / 2);

    const rankings = {
      highest,
      lowest,
      average,
      median,
      students
    };

    await this.redis.set(cacheKey, JSON.stringify(rankings), 'EX', 3600); // cache for 1 hour
    return rankings;
  }

  async generateReportCardPdf(branchId: string, examId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, branchId }
    });
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, branchId },
      include: { subjects: true }
    });

    if (!student || !exam) throw new NotFoundException('Data not found');

    const results = await this.prisma.examResult.findMany({
      where: { examId, studentId },
      include: { subject: true }
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        const fileKey = `report-cards/${branchId}/${examId}/${studentId}.pdf`;
        
        try {
          await this.s3Client.send(new PutObjectCommand({
            Bucket: this.configService.get('R2_BUCKET_NAME') || 'nkc-ims-vault',
            Key: fileKey,
            Body: pdfData,
            ContentType: 'application/pdf',
          }));

          const url = await getSignedUrl(
            this.s3Client,
            new GetObjectCommand({
              Bucket: this.configService.get('R2_BUCKET_NAME') || 'nkc-ims-vault',
              Key: fileKey
            }),
            { expiresIn: 3600 }
          );

          resolve({ url });
        } catch (err) {
          reject(err);
        }
      });

      // Draw PDF
      doc.fontSize(20).text('Report Card', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Name: ${student.firstName} ${student.lastName}`);
      doc.text(`Enrollment No: ${student.enrollmentNumber}`);
      doc.text(`Exam: ${exam.name} (${exam.examDate.toISOString().split('T')[0]})`);
      doc.moveDown();

      doc.fontSize(12);
      let totalObtained = 0;
      results.forEach(r => {
        doc.text(`${r.subject.name}: ${r.marksObtained} / ${r.subject.maxMarks}`);
        totalObtained += r.marksObtained;
      });

      doc.moveDown();
      doc.fontSize(14).text(`Total: ${totalObtained} / ${exam.totalMarks}`);
      
      const percentage = exam.totalMarks > 0 ? (totalObtained / exam.totalMarks) * 100 : 0;
      doc.text(`Percentage: ${percentage.toFixed(2)}%`);

      doc.end();
    });
  }

  // Basic CRUD for frontend
  async createExam(branchId: string, payload: any) {
    const { name, batchId, examDate, subjects, invigilatorId } = payload;
    const totalMarks = subjects.reduce((sum: number, s: any) => sum + s.maxMarks, 0);

    return this.prisma.exam.create({
      data: {
        name,
        batchId,
        branchId,
        invigilatorId: invigilatorId || null,
        examDate: new Date(examDate),
        totalMarks,
        status: ExamStatus.SCHEDULED,
        subjects: {
          create: subjects.map((s: any) => ({
            name: s.name,
            maxMarks: s.maxMarks,
            passingMarks: s.passingMarks
          }))
        }
      }
    });
  }

  async listExams(branchId: string) {
    return this.prisma.exam.findMany({
      where: { branchId },
      include: { batch: true, subjects: true },
      orderBy: { examDate: 'desc' },
      take: 100
    });
  }

  async getExam(branchId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, branchId },
      include: { batch: true, subjects: true }
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }
}
