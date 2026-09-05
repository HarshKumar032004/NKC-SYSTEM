import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimetableConflictService } from './timetable-conflict.service';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictService: TimetableConflictService
  ) {}

  async getSessions(branchId: string) {
    return this.prisma.timetableSession.findMany({
      where: { branchId },
      include: {
        batch: { include: { course: true } },
        teacher: true,
        room: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
  }

  async createSession(
    branchId: string,
    batchId: string,
    teacherId: string,
    roomId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string
  ) {
    // 1. Validate against conflicts
    await this.conflictService.validateSession(
      branchId, teacherId, roomId, batchId, dayOfWeek, startTime, endTime
    );

    // 2. Create session
    return this.prisma.timetableSession.create({
      data: {
        branchId,
        batchId,
        teacherId,
        roomId,
        dayOfWeek,
        startTime,
        endTime
      }
    });
  }

  async updateSession(
    id: string,
    branchId: string,
    data: {
      batchId?: string;
      teacherId?: string;
      roomId?: string;
      dayOfWeek?: DayOfWeek;
      startTime?: string;
      endTime?: string;
    }
  ) {
    const existing = await this.prisma.timetableSession.findFirst({
      where: { id, branchId }
    });

    if (!existing) throw new NotFoundException('Session not found');

    const teacherId = data.teacherId || existing.teacherId;
    const roomId = data.roomId || existing.roomId;
    const batchId = data.batchId || existing.batchId;
    const dayOfWeek = data.dayOfWeek || existing.dayOfWeek;
    const startTime = data.startTime || existing.startTime;
    const endTime = data.endTime || existing.endTime;

    // 1. Validate against conflicts (exclude self)
    await this.conflictService.validateSession(
      branchId, teacherId, roomId, batchId, dayOfWeek, startTime, endTime, id
    );

    // 2. Update session
    return this.prisma.timetableSession.update({
      where: { id },
      data
    });
  }

  async deleteSession(id: string, branchId: string) {
    const existing = await this.prisma.timetableSession.findFirst({
      where: { id, branchId }
    });

    if (!existing) throw new NotFoundException('Session not found');

    return this.prisma.timetableSession.delete({
      where: { id }
    });
  }
}
