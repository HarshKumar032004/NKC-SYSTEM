import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationPayload } from './notification-provider.interface';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService
  ) {
    this.fromEmail = this.configService.get<string>('MAIL_FROM') || 'noreply@nkcims.com';
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(`Dispatching Email to ${payload.to}...`);
    try {
      await this.mailerService.sendMail({
        to: payload.to,
        from: this.fromEmail,
        subject: payload.title || 'NKC IMS Notification',
        text: payload.body,
        html: `<p>${payload.body}</p>`,
      });
      this.logger.log(`Email sent successfully to ${payload.to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send Email to ${payload.to}: ${error.message}`, error.stack);
      return false;
    }
  }
}
