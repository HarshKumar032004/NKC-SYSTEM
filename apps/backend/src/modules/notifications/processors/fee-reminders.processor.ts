import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmsProvider } from '../providers/sms.provider';

@Processor('fee-reminders')
export class FeeRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(FeeRemindersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsProvider: SmsProvider
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing fee reminder job: ${job.id}`);
    
    // In a real cron scenario, this job might just contain { branchId }
    // and the processor scans for all pending installments due in 3 days.
    // For this example, let's assume it passes specific installment data.
    const { studentId, installmentId, branchId, amountDue, dueDate } = job.data;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { guardians: true }
    });

    if (!student || !student.guardians.length) {
      return;
    }

    const message = `Reminder: Fee installment of ${amountDue / 100} is due on ${dueDate} for ${student.firstName}. Please pay to avoid late fees.`;

    for (const guardian of student.guardians) {
      if (guardian.phone) {
        await this.smsProvider.send({
          to: guardian.phone,
          body: message
        });

        await this.prisma.notification.create({
          data: {
            recipientId: guardian.id,
            recipientType: 'GUARDIAN',
            channel: 'SMS',
            title: 'Fee Reminder',
            body: message,
            status: 'DELIVERED',
            branchId
          }
        });
      }
    }

    return { success: true };
  }
}
