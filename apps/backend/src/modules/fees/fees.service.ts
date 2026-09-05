import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentMethod, PaymentStatus, InstallmentStatus, AuditAction, User } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { STORAGE_CLIENT } from '../storage/storage.module';
import { maskPii } from '../../utils/mask-pii.util';
import { Redis } from 'ioredis';

@Injectable()
export class FeesService {
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly alertsService: AlertsService,
  ) {
    this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'nkc-ims-vault';
  }

  async getFeeStructures(branchId: string) {
    return this.prisma.feeStructure.findMany({
      where: { branchId, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createFeeStructure(branchId: string, data: { name: string; totalAmount: number }) {
    return this.prisma.feeStructure.create({
      data: {
        ...data,
        branchId
      }
    });
  }

  async getFeeLedger(branchId: string) {
    // Basic aggregation: Fetch students with their due installments
    return this.prisma.student.findMany({
      where: { branchId },
      include: {
        feeInstallments: {
          orderBy: { dueDate: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getStudentLedger(studentId: string, branchId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, branchId },
      include: {
        feeInstallments: {
          include: { feeStructure: true },
          orderBy: { dueDate: 'asc' }
        },
        paymentTransactions: {
          include: { receipt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async processPayment(
    studentId: string,
    installmentId: string,
    amount: number, // Must be in cents
    method: PaymentMethod,
    referenceNumber: string | null,
    user: User,
    auditContext?: { ip?: string; userAgent?: string }
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    let retries = 3;
    while (retries > 0) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 1. Fetch Installment
          const installment = await tx.feeInstallment.findFirst({
            where: { id: installmentId, studentId, student: { branchId: user.branchId } }
          });

          if (!installment) throw new NotFoundException('Fee Installment not found');

          // 2. Validate Amount
          const remainingDue = installment.amountDue - installment.amountPaid;
          
          // Enforce full payment of the remaining installment to prevent underpayment vulnerabilities
          if (amount !== remainingDue) {
            await this.alertsService.sendSecurityAlert(
              'Payment Anomaly Detected',
              `A partial payment attempt was made which is disabled by system policy.`,
              { studentId, installmentId, amountAttempted: amount, remainingDue }
            );
            throw new BadRequestException(`Partial payments are disabled. Payment amount (${amount}) must exactly match the remaining due (${remainingDue})`);
          }

          // 3. Create PaymentTransaction
          const transaction = await tx.paymentTransaction.create({
            data: {
              studentId,
              branchId: user.branchId,
              amount,
              paymentMethod: method,
              referenceNumber,
              status: PaymentStatus.SUCCESS
            }
          });

          // 4. Update Installment
          const newPaidAmount = installment.amountPaid + amount;
          let newStatus = installment.status;
          
          if (newPaidAmount === installment.amountDue) {
            newStatus = InstallmentStatus.PAID;
          } else if (newPaidAmount > 0) {
            newStatus = InstallmentStatus.PARTIALLY_PAID;
          }

          await tx.feeInstallment.update({
            where: { id: installmentId },
            data: { amountPaid: newPaidAmount, status: newStatus }
          });

          // 5. Generate Receipt Sequence using Redis Atomic Counter
          const currentYear = new Date().getFullYear();
          const seqKey = `seq:receipt:${user.branchId}:${currentYear}`;
          let seqNumber = await this.redis.incr(seqKey);
          
          if (seqNumber === 1) {
            const receiptCount = await tx.receipt.count({
              where: { 
                createdAt: {
                  gte: new Date(`${currentYear}-01-01T00:00:00.000Z`)
                }
              }
            });
            await this.redis.set(seqKey, receiptCount + 1);
            seqNumber = receiptCount + 1;
          }
          
          const seq = seqNumber.toString().padStart(4, '0');
          const branchCode = user.branchId.substring(0, 4).toUpperCase();
          const receiptNumber = `REC/${branchCode}/${currentYear}/${seq}`;

          // 6. Create Receipt DB entry (documentUrl will be populated after PDF generation)
          const receipt = await tx.receipt.create({
            data: {
              transactionId: transaction.id,
              receiptNumber,
            }
          });

          // 7. Audit Log
          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: AuditAction.CREATE,
              entity: 'PaymentTransaction',
              entityId: transaction.id,
              newData: JSON.stringify({ amount, receiptNumber }),
              ipAddress: auditContext?.ip || null,
              userAgent: auditContext?.userAgent || null,
            }
          });

          return { transaction, receipt };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: any) {
        // Handle serialization failure (P2034) or unique constraint violation (P2002)
        if (error.code === 'P2034' || error.code === 'P2002') {
          retries--;
          if (retries === 0) {
            throw new BadRequestException('System is experiencing high load. Could not process payment. Please try again.');
          }
          // Loop continues to retry
        } else {
          throw error;
        }
      }
    }
    throw new Error('Unreachable');
  }

  async generateAndUploadReceiptPdf(receiptId: string, studentId: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        transaction: {
          include: { student: true, branch: true }
        }
      }
    });

    if (!receipt) throw new NotFoundException('Receipt not found');

    const pdfBuffer = await this.buildPdfBuffer(receipt);
    
    // Upload to S3
    const fileKey = `receipts/${receipt.transaction.branchId}/${new Date().getFullYear()}/${receipt.receiptNumber.split('/').join('_')}.pdf`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    }));

    // Save only the key to the DB to satisfy "no public read" bucket policies
    const documentUrl = fileKey;

    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { documentUrl }
    });

    // Generate and return a secure 1-hour presigned URL for immediate download
    const presignedUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      }),
      { expiresIn: 3600 }
    );

    return presignedUrl;
  }

  private buildPdfBuffer(receipt: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text('FEE RECEIPT', { align: 'center' });
        doc.moveDown();

        // Branch Info
        doc.fontSize(12).text(`Branch: ${receipt.transaction.branch.name}`);
        doc.text(`Date: ${new Date(receipt.createdAt).toLocaleString()}`);
        doc.text(`Receipt No: ${receipt.receiptNumber}`);
        doc.moveDown();

        // Student Info
        doc.text(`Student Name: ${receipt.transaction.student.firstName} ${receipt.transaction.student.lastName}`);
        doc.text(`Enrollment No: ${receipt.transaction.student.enrollmentNumber}`);
        doc.moveDown();

        // Transaction Details
        doc.text('Payment Details:', { underline: true });
        // amount is in cents, convert to display format
        const displayAmount = (receipt.transaction.amount / 100).toFixed(2);
        doc.text(`Amount Paid: Rs. ${displayAmount}`);
        doc.text(`Payment Method: ${receipt.transaction.paymentMethod}`);
        if (receipt.transaction.referenceNumber) {
          doc.text(`Reference: ${receipt.transaction.referenceNumber}`);
        }
        
        doc.moveDown(4);
        doc.fontSize(10).text('This is a computer-generated receipt and requires no physical signature.', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
