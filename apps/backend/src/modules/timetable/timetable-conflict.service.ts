import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class TimetableConflictService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates if the incoming session conflicts with any existing sessions.
   * Throws a ConflictException if an overlap is found in Teacher, Room, or Batch.
   */
  async validateSession(
    branchId: string,
    teacherId: string,
    roomId: string,
    batchId: string,
    dayOfWeek: DayOfWeek,
    startTime: string, // "HH:mm"
    endTime: string,   // "HH:mm"
    excludeSessionId?: string
  ): Promise<void> {
    
    if (startTime >= endTime) {
      throw new ConflictException('Start time must be before end time');
    }

    // A session overlaps if: (existingStart < incomingEnd) AND (existingEnd > incomingStart)
    const baseWhere = {
      branchId,
      dayOfWeek,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {})
    };

    // 1. Check Teacher Conflict
    const teacherConflict = await this.prisma.timetableSession.findFirst({
      where: { ...baseWhere, teacherId },
      include: { teacher: true }
    });

    if (teacherConflict) {
      throw new ConflictException(
        `Teacher ${teacherConflict.teacher.name} is already booked from ${teacherConflict.startTime} to ${teacherConflict.endTime} on ${dayOfWeek}.`
      );
    }

    // 2. Check Room Conflict
    const roomConflict = await this.prisma.timetableSession.findFirst({
      where: { ...baseWhere, roomId },
      include: { room: true }
    });

    if (roomConflict) {
      throw new ConflictException(
        `Room '${roomConflict.room.name}' is already booked from ${roomConflict.startTime} to ${roomConflict.endTime} on ${dayOfWeek}.`
      );
    }

    // 3. Check Batch Conflict
    const batchConflict = await this.prisma.timetableSession.findFirst({
      where: { ...baseWhere, batchId },
      include: { batch: { include: { course: true } } }
    });

    if (batchConflict) {
      throw new ConflictException(
        `Batch '${batchConflict.batch.name}' (${batchConflict.batch.course.name}) already has a class from ${batchConflict.startTime} to ${batchConflict.endTime} on ${dayOfWeek}.`
      );
    }
  }
}
