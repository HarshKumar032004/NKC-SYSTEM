import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly adminEmail: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {
    // Default to the mail_from if no explicit admin email is set
    this.adminEmail = this.configService.get<string>('MAIL_FROM') || 'admin@nkcims.com';
  }

  /**
   * Dispatch a security or anomaly alert to the system administrators.
   */
  async sendSecurityAlert(subject: string, message: string, metadata?: any) {
    this.logger.warn(`SECURITY ALERT: ${subject} | ${message}`);
    
    try {
      await this.mailerService.sendMail({
        to: this.adminEmail,
        subject: `[NKC-IMS Alert] ${subject}`,
        text: `${message}\n\nMetadata:\n${JSON.stringify(metadata || {}, null, 2)}`,
        html: `
          <h2>Security Alert</h2>
          <p><strong>${subject}</strong></p>
          <p>${message}</p>
          ${metadata ? `<pre>${JSON.stringify(metadata, null, 2)}</pre>` : ''}
        `,
      });
      this.logger.log(`Security alert email sent to ${this.adminEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send security alert email: ${error.message}`, error.stack);
    }
  }
}
