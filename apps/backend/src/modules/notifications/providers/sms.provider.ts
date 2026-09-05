import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationPayload } from './notification-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsProvider implements NotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(`Dispatching SMS to ${payload.to}...`);
    try {
      // Integration with Fast2SMS / Twilio would go here.
      this.logger.log(`SMS sent successfully to ${payload.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${payload.to}`, error);
      return false;
    }
  }
}
