import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppProvider } from '../providers/whatsapp.provider';

@Processor('attendance-alerts')
export class AttendanceAlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AttendanceAlertsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappProvider: WhatsAppProvider
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing attendance alert job: ${job.id}`);
    const { studentId, date, branchId } = job.data;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { guardians: true }
    });

    if (!student || !student.guardians.length) {
      this.logger.warn(`No guardians found for student ${studentId}`);
      return;
    }

    // Assuming we have a template in DB or hardcoded for now
    const message = `Dear Guardian, this is to inform you that ${student.firstName} ${student.lastName} was marked ABSENT on ${date}. Please contact the institute for more details.`;

    for (const guardian of student.guardians) {
      if (guardian.phone) {
        await this.whatsappProvider.send({
          to: guardian.phone,
          body: message
        });

        // Log notification in DB
        await this.prisma.notification.create({
          data: {
            recipientId: guardian.id,
            recipientType: 'GUARDIAN',
            channel: 'WHATSAPP',
            title: 'Absence Alert',
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
