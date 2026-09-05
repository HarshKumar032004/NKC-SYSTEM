import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { EnvVars } from '../config/env.schema';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVars>) => {
        // Prefer REDIS_URL (Upstash / production) over individual host+port (local dev)
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return new Redis(redisUrl, {
            // Required for Upstash TLS (rediss:// protocol)
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            maxRetriesPerRequest: null, // Required by BullMQ
          });
        }

        // Fallback to local Redis for dev without REDIS_URL set
        const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
        const port = configService.get<number>('REDIS_PORT') ?? 6379;
        return new Redis({ host, port, maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
