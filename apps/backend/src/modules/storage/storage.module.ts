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
        const s3Endpoint = configService.get('S3_ENDPOINT', { infer: true });
        const accountId = configService.get('R2_ACCOUNT_ID', { infer: true });
        
        let endpoint = s3Endpoint;
        if (!endpoint && accountId) {
          endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
        }

        return new S3Client({
          region: configService.get('S3_REGION', { infer: true }),
          endpoint,
          credentials: {
            accessKeyId: configService.get('R2_ACCESS_KEY_ID', { infer: true }),
            secretAccessKey: configService.get('R2_SECRET_ACCESS_KEY', { infer: true }),
          },
          forcePathStyle: !!s3Endpoint, // Supabase and Minio usually require this
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_CLIENT],
})
export class StorageModule {}
