import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateStudentDto, UpdateStudentDto, StudentFilterQueryDto } from '@nkc/shared-types';
import { User, AuditAction } from '@prisma/client';
import { STORAGE_CLIENT } from '../storage/storage.module';
import { Redis } from 'ioredis';
import { maskPii } from '../../utils/mask-pii.util';

@Injectable()
export class StudentsService {
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'nkc-ims-vault';
  }



  // Local helper for AuditLogs since there's no AuditLog service yet
  private async logAudit(
    tx: any, 
    userId: string, 
    action: AuditAction, 
    entityId: string, 
    oldData: any, 
    newData: any,
    auditContext?: { ip?: string; userAgent?: string }
  ) {
    await tx.auditLog.create({
      data: {
        userId,
        action,
        entity: 'Student',
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress: auditContext?.ip || null,
        userAgent: auditContext?.userAgent || null,
      },
    });
  }

  async createStudent(dto: CreateStudentDto, user: User, auditContext?: { ip?: string; userAgent?: string }) {
    // Enforce branch isolation: only SUPER_ADMIN can create outside their own branch
    const isSuperAdmin = (user as any).role === 'SUPER_ADMIN';
    const activeBranchId = isSuperAdmin && dto.branchId ? dto.branchId : user.branchId;

    // 1. Get atomic incremental sequence from Redis
    const seqKey = `seq:student:${activeBranchId}`;
    let seqNumber = await this.redis.incr(seqKey);

    // If first time, seed from DB count (graceful fallback)
    if (seqNumber === 1) {
      const dbCount = await this.prisma.student.count({ where: { branchId: activeBranchId } });
      await this.redis.set(seqKey, dbCount + 1);
      seqNumber = dbCount + 1;
    }

    const enrollmentNumber = `NKC-${user.branchId.substring(0, 4)}-${new Date().getFullYear()}-${seqNumber.toString().padStart(4, '0')}`;

    // Fetch batch to get course baseFee
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { course: true }
    });
    if (!batch) throw new BadRequestException('Invalid batch ID');

    // Fetch branch to get hostelFee and messFee
    const branch = await this.prisma.branch.findUnique({
      where: { id: activeBranchId }
    });
    if (!branch) throw new BadRequestException('Branch not found');



    return await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          enrollmentNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dob: dto.dob,
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
          branchId: activeBranchId, // Enforced tenant isolation
          photoUrl: dto.photoUrl,
          address: dto.address,
          email: dto.email,
          phone: dto.phone,
          aadharNumber: dto.aadharNumber,
          admissionDate: dto.admissionDate,
          previousSchool: dto.previousSchool,
          isHosteler: dto.isHosteler,
          discountPercent: dto.discountPercent,
          paymentType: dto.paymentType,
          guardians: {
            create: dto.guardians.map((g: any) => ({
              name: g.name,
              relationship: g.relationship,
              phone: g.phone,
              email: g.email,
              occupation: g.occupation,
              isPrimary: g.isPrimary,
            })),
          },
          enrollments: {
            create: {
              batchId: dto.batchId,
              status: 'ACTIVE',
            },
          },
        },
        include: { guardians: true, enrollments: true },
      });

      // Create Fee Installments based on selected fee structures
      if (dto.feeStructureIds && dto.feeStructureIds.length > 0) {
        const structures = await tx.feeStructure.findMany({
          where: { id: { in: dto.feeStructureIds }, branchId: activeBranchId }
        });
        
        const installmentsToCreate = [];
        
        for (const struct of structures) {
          const structAmount = struct.totalAmount; // cents
          const discountedAmount = Math.max(0, structAmount - Math.floor(structAmount * (dto.discountPercent || 0) / 100));
          
          if (dto.paymentType === 'INSTALLMENT') {
            // Split into 2 installments
            const halfFee = Math.floor(discountedAmount / 2);
            installmentsToCreate.push({
              studentId: student.id,
              feeStructureId: struct.id,
              amountDue: halfFee,
              dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            });
            installmentsToCreate.push({
              studentId: student.id,
              feeStructureId: struct.id,
              amountDue: discountedAmount - halfFee,
              dueDate: new Date(new Date().setMonth(new Date().getMonth() + 4)),
            });
          } else {
            // Lump sum - single installment
            installmentsToCreate.push({
              studentId: student.id,
              feeStructureId: struct.id,
              amountDue: discountedAmount,
              dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // 15 days from now
            });
          }
        }
        
        if (installmentsToCreate.length > 0) {
          await tx.feeInstallment.createMany({ data: installmentsToCreate });
        }
      }

      if (dto.leadId) {
        await tx.lead.update({
          where: { id: dto.leadId },
          data: { status: 'CONVERTED' }
        });
      }

      await this.logAudit(tx, user.id, 'CREATE', student.id, null, student, auditContext);
      return student;
    }, { timeout: 15000 });
  }

  async findAll(query: StudentFilterQueryDto, user: User) {
    // Enforce branch isolation: only SUPER_ADMIN can query outside their own branch
    const isSuperAdmin = (user as any).role === 'SUPER_ADMIN';
    const activeBranchId = isSuperAdmin && query.branchId ? query.branchId : user.branchId;

    const where: any = {
      branchId: activeBranchId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { enrollmentNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.batchId) {
      where.enrollments = {
        some: { batchId: query.batchId },
      };
    }

    if ((query as any).isHosteler !== undefined) {
      where.isHosteler = String((query as any).isHosteler) === 'true';
    }

    if ((query as any).feeStatus) {
      if ((query as any).feeStatus === 'OVERDUE' || (query as any).feeStatus === 'PENDING') {
        where.feeInstallments = { some: { status: (query as any).feeStatus } };
      } else if ((query as any).feeStatus === 'PAID') {
        where.feeInstallments = { every: { status: 'PAID' } };
      }
    }

    const students = await this.prisma.student.findMany({
      where,
      take: query.take,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: { include: { batch: true } },
      },
    });

    return students;
  }

  async findOne(id: string, user: User) {
    const student = await this.prisma.student.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      include: {
        guardians: true,
        enrollments: { include: { batch: { include: { course: true } } } },
        documents: true,
        examResults: { include: { exam: true, subject: true } }
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found in your branch`);
    }

    // Fetch audit history manually
    const audits = await this.prisma.auditLog.findMany({
      where: { entity: 'Student', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { email: true } } },
    });

    return { ...student, auditHistory: audits };
  }

  async update(id: string, dto: UpdateStudentDto, user: User, auditContext?: { ip?: string; userAgent?: string }) {
    const isSuperAdmin = (user as any).role === 'SUPER_ADMIN';
    const activeBranchId = isSuperAdmin && dto.branchId ? dto.branchId : user.branchId;

    const student = await this.prisma.student.findFirst({
      where: { id, branchId: activeBranchId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException(`Student not found`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Remove nested creations/updates from dto if they exist for a simple update
      // In a robust implementation we'd handle updating guardians and enrollments too.
      // For now, we update scalar fields.
      const dataToUpdate = { ...dto } as any;
      delete dataToUpdate.guardians;
      delete dataToUpdate.enrollments;
      delete dataToUpdate.batchId;
      delete dataToUpdate.skills;

      const updatedStudent = await tx.student.update({
        where: { id },
        data: dataToUpdate,
      });

      await this.logAudit(tx, user.id, 'UPDATE', student.id, student, updatedStudent, auditContext);
      return updatedStudent;
    });
  }

  async addDocument(studentId: string, fileName: string, mimeType: string, sizeBytes: number, fileUrl: string, fileKey: string, user: User) {
    const isSuperAdmin = (user as any).role === 'SUPER_ADMIN';

    // Ensure student exists and belongs to branch (or user is SUPER_ADMIN)
    const student = await this.prisma.student.findFirst({
      where: { 
        id: studentId, 
        ...(isSuperAdmin ? {} : { branchId: user.branchId }), 
        deletedAt: null 
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const document = await this.prisma.document.create({
      data: {
        studentId,
        fileName,
        fileKey,
        mimeType,
        sizeBytes,
      },
    });

    return { document, fileUrl };
  }

  async generatePresignedDownloadUrl(studentId: string, documentId: string, user: User) {
    const isSuperAdmin = (user as any).role === 'SUPER_ADMIN';

    const document = await this.prisma.document.findFirst({
      where: { 
        id: documentId, 
        studentId,
        ...(isSuperAdmin ? {} : { student: { branchId: user.branchId } })
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Since we are using Supabase public bucket 'documents'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dctnbaxvjwolehmqmkdx.supabase.co';
    const url = `${supabaseUrl}/storage/v1/object/public/documents/${document.fileKey}`;

    return { downloadUrl: url };
  }

  async getEnrollmentsByBatch(branchId: string, batchId: string, status?: string) {
    const where: any = {
      batchId,
      student: { branchId },
      ...(status ? { status } : {}),
    };

    return this.prisma.enrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentNumber: true,
            status: true,
            photoUrl: true,
          }
        }
      },
      orderBy: {
        student: { firstName: 'asc' }
      }
    });
  }
}
