import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
