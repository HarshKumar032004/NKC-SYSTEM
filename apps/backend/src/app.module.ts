import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { MailerModule } from '@nestjs-modules/mailer';
import { Redis } from 'ioredis';

import { appConfig, databaseConfig, redisConfig } from './config/env.config';
import { envValidationSchema, EnvVars } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CaslModule } from './casl/casl.module';
import { RedisModule } from './redis/redis.module';
import { StudentsModule } from './modules/students/students.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { FeesModule } from './modules/fees/fees.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExamsModule } from './modules/exams/exams.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { HrModule } from './modules/hr/hr.module';
import { OperationsModule } from './modules/operations/operations.module';
import { StorageModule } from './modules/storage/storage.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { BranchesModule } from './modules/branches/branches.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
      load: [appConfig, databaseConfig, redisConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars>) => {
        const redisUrl = config.get<string>('REDIS_URL');
        let redisClient: Redis;
        if (redisUrl) {
          redisClient = new Redis(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          });
        } else {
          redisClient = new Redis({
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
          });
        }
        return {
          throttlers: [{ ttl: 60000, limit: 100 }], // 100 requests per minute by default
          storage: new ThrottlerStorageRedisService(redisClient),
        };
      },
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars>) => ({
        transport: {
          host: config.get<string>('SMTP_HOST'),
          port: config.get<number>('SMTP_PORT'),
          secure: config.get<number>('SMTP_PORT') === 465,
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
        },
        defaults: {
          from: `"NKC System" <${config.get<string>('MAIL_FROM')}>`,
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    CaslModule,
    AuthModule,
    HealthModule,
    StudentsModule,
    AdmissionsModule,
    FeesModule,
    TimetableModule,
    AttendanceModule,
    ExamsModule,
    NotificationsModule,
    ReportsModule,
    PrivacyModule,
    HrModule,
    OperationsModule,
    AlertsModule,
    BranchesModule,
    MaintenanceModule,
    UsersModule,
  ],
  providers: [
    {
      provide: require('@nestjs/core').APP_GUARD,
      useClass: require('@nestjs/throttler').ThrottlerGuard,
    }
  ]
})
export class AppModule {}
