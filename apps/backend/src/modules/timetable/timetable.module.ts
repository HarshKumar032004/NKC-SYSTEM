import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableConflictService } from './timetable-conflict.service';
import { TimetableController } from './timetable.controller';

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, TimetableConflictService],
  exports: [TimetableService],
})
export class TimetableModule {}
