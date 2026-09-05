import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fastcsv from 'fast-csv';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PassThrough } from 'stream';

import { STORAGE_CLIENT } from '../../storage/storage.module';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';

@Processor('data-export')
export class DataExportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataExportProcessor.name);
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    @Inject(STORAGE_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService
  ) {
    super();
    this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'nkc-ims-vault';
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing data export job: ${job.id}`);
    const { branchId, userId, type } = job.data;

    try {
      const passThrough = new PassThrough();
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(passThrough);

      // In a real scenario, you'd use Prisma cursors or raw streams to avoid loading everything into RAM
      // E.g. using a cursor loop to fetch 1000 rows at a time and pipe them:
      // const records = await this.prisma.paymentTransaction.findMany(...)
      // records.forEach(r => csvStream.write(r))
      
      csvStream.write({ id: '1', name: 'Mock Data Row 1', type });
      csvStream.write({ id: '2', name: 'Mock Data Row 2', type });
      csvStream.end();

      const fileName = `exports/${branchId}/${type}-${Date.now()}.csv`;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: passThrough,
        ContentType: 'text/csv'
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      // Generate Presigned URL
      const getCommand = new GetObjectCommand({ Bucket: uploadParams.Bucket, Key: uploadParams.Key });

      
      let downloadUrl = 'http://localhost/mock-download-url';
      try {
        downloadUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 3600 });
      } catch (err) {
        this.logger.warn('Failed to generate presigned URL (likely missing real AWS keys)');
      }

      // Notify the user via In-App WebSocket
      this.notificationsGateway.emitInAppNotification(userId, {
        title: 'Export Ready',
        body: `Your ${type} export is ready for download.`,
        url: downloadUrl
      });

      this.logger.log(`Export completed for user ${userId}`);
      return { success: true, url: downloadUrl };

    } catch (err) {
      this.logger.error(`Export failed for job ${job.id}`, err);
      
      this.notificationsGateway.emitInAppNotification(userId, {
        title: 'Export Failed',
        body: `Your ${type} export encountered an error.`
      });
      
      throw err;
    }
  }
}
