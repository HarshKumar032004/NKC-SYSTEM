import { Module } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { RedisModule } from '../../redis/redis.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [RedisModule, StorageModule],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
