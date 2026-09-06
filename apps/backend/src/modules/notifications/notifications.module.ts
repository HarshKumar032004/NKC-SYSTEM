import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Redis } from 'ioredis';

import { NotificationsGateway } from './notifications.gateway';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { SmsProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';
import { AttendanceAlertsProcessor } from './processors/attendance-alerts.processor';
import { FeeRemindersProcessor } from './processors/fee-reminders.processor';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: new Redis(redisUrl, {
              tls: redisUrl.startsWith('rediss://') ? {} : undefined,
              maxRetriesPerRequest: null,
            }),
          };
        }
        return {
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'attendance-alerts' },
      { name: 'fee-reminders' },
      { name: 'report-generation' }
    ),
  ],
  providers: [
    NotificationsGateway,
    WhatsAppProvider,
    SmsProvider,
    EmailProvider,
    AttendanceAlertsProcessor,
    FeeRemindersProcessor
  ],
  exports: [BullModule, NotificationsGateway]
})
export class NotificationsModule {}
