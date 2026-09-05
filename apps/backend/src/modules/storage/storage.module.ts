import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { EnvVars } from '../../config/env.schema';

export const STORAGE_CLIENT = 'STORAGE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CLIENT,
      useFactory: (configService: ConfigService<EnvVars, true>) => {
        const accountId = configService.get('R2_ACCOUNT_ID', { infer: true });
        return new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: configService.get('R2_ACCESS_KEY_ID', { infer: true }),
            secretAccessKey: configService.get('R2_SECRET_ACCESS_KEY', { infer: true }),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_CLIENT],
})
export class StorageModule {}
