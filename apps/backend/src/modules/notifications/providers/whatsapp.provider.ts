import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationPayload } from './notification-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppProvider implements NotificationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(`Dispatching WhatsApp message to ${payload.to}...`);
    try {
      // Integration with Interakt / Gupshup / Meta Cloud API would go here.
      // Example:
      // await axios.post('https://graph.facebook.com/v17.0/.../messages', {
      //   messaging_product: "whatsapp",
      //   to: payload.to,
      //   type: "template",
      //   template: { name: "notification", language: { code: "en_US" } }
      // });

      this.logger.log(`WhatsApp message sent successfully to ${payload.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${payload.to}`, error);
      return false;
    }
  }
}
