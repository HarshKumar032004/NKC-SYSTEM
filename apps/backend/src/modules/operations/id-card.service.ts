import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class IdCardService {
  private readonly logger = new Logger(IdCardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to draw a single ID card at specific (x, y) coordinates on the PDF document.
   */
  private drawIdCard(doc: any, x: number, y: number, student: any) {
    const cardWidth = 240;
    const cardHeight = 350;

    // Draw card outline
    doc.rect(x, y, cardWidth, cardHeight).stroke('#cccccc');

    // Header Background
    doc.rect(x + 1, y + 1, cardWidth - 2, 60).fill('#0f172a');
    
    // Header Text
    doc.fillColor('#ffffff').fontSize(14).text('NKC INSTITUTE', x, y + 20, {
      width: cardWidth,
      align: 'center',
    });
    doc.fontSize(8).text('Excellence in Education', x, y + 40, {
      width: cardWidth,
      align: 'center',
    });

    // Reset color for body
    doc.fillColor('#000000');

    // Photo placeholder box (since we don't have actual S3 images available in this env)
    const photoX = x + (cardWidth - 80) / 2;
    const photoY = y + 80;
    doc.rect(photoX, photoY, 80, 100).stroke('#cccccc');
    doc.fontSize(8).fillColor('#999999').text('PHOTO', photoX, photoY + 45, {
      width: 80,
      align: 'center',
    });

    // Student Info
    doc.fillColor('#000000');
    doc.fontSize(14).font('Helvetica-Bold').text(`${student.firstName} ${student.lastName}`, x, y + 200, {
      width: cardWidth,
      align: 'center',
    });

    doc.fontSize(10).font('Helvetica').text(`ID: ${student.enrollmentNumber}`, x, y + 225, {
      width: cardWidth,
      align: 'center',
    });

    const batchName = student.enrollments?.[0]?.batch?.name || 'N/A';
    doc.text(`Batch: ${batchName}`, x, y + 245, {
      width: cardWidth,
      align: 'center',
    });

    const dobString = student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A';
    doc.text(`DOB: ${dobString}`, x, y + 265, {
      width: cardWidth,
      align: 'center',
    });
    
    if (student.bloodGroup) {
      doc.text(`Blood Group: ${student.bloodGroup}`, x, y + 285, {
        width: cardWidth,
        align: 'center',
      });
    }

    // Footer
    doc.rect(x + 1, y + cardHeight - 30, cardWidth - 2, 29).fill('#f1f5f9');
    doc.fillColor('#64748b').fontSize(8).text('Authorized Signature', x + 20, y + cardHeight - 20, {
      width: cardWidth - 40,
      align: 'right',
    });
  }

  /**
   * Generates a PDF for a single student.
   * Returns a Buffer containing the PDF data.
   */
  async generateIdCard(branchId: string, studentId: string): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, branchId },
      include: {
        enrollments: {
          include: { batch: true },
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!student) {
      throw new NotFoundException('Student not found in this branch.');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // A4 size is roughly 595 x 842 points.
        // We'll draw one card centered on the page for single generate
        const startX = (595 - 240) / 2;
        const startY = 50;

        this.drawIdCard(doc, startX, startY, student);

        doc.end();
      } catch (err) {
        this.logger.error('Failed to generate PDF', err);
        reject(err);
      }
    });
  }

  /**
   * Bulk generates ID cards for an entire batch.
   * Paginated layout with 2x2 grid (4 cards per page).
   */
  async bulkGenerateIdCards(branchId: string, batchId: string): Promise<Buffer> {
    const students = await this.prisma.student.findMany({
      where: {
        branchId,
        enrollments: {
          some: { batchId, status: 'ACTIVE' }
        }
      },
      include: {
        enrollments: {
          include: { batch: true },
          where: { batchId, status: 'ACTIVE' },
          take: 1
        }
      },
      orderBy: { firstName: 'asc' }
    });

    if (!students.length) {
      throw new NotFoundException('No active students found in this batch.');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const marginX = 40;
        const marginY = 40;
        const cardWidth = 240;
        const cardHeight = 350;
        const gapX = 35; // (595 - (40*2) - (240*2)) = 515 - 480 = 35
        const gapY = 40;

        let index = 0;

        for (const student of students) {
          const pageIndex = index % 4;
          
          if (index > 0 && pageIndex === 0) {
            doc.addPage();
          }

          const col = pageIndex % 2;
          const row = Math.floor(pageIndex / 2);

          const x = marginX + col * (cardWidth + gapX);
          const y = marginY + row * (cardHeight + gapY);

          this.drawIdCard(doc, x, y, student);

          index++;
        }

        doc.end();
      } catch (err) {
        this.logger.error('Failed to bulk generate PDFs', err);
        reject(err);
      }
    });
  }
}
