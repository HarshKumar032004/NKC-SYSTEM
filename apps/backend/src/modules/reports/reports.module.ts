import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DataExportProcessor } from './processors/data-export.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    BullModule.registerQueue({
      name: 'data-export',
    }),
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, DataExportProcessor],
})
export class ReportsModule {}
