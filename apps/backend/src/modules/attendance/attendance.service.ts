import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Redis } from 'ioredis';
import { AttendanceGateway } from './attendance.gateway';
import { AttendanceStatus, User } from '@prisma/client';
import { getDayOfWeekFromDate } from './day-helper';
import { ForbiddenException } from '@nestjs/common';

export interface BulkAttendanceDto {
  batchId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  records: {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly gateway: AttendanceGateway
  ) {}

  /**
   * High-performance bulk attendance upsert.
   */
  async markBulkAttendance(branchId: string, payload: BulkAttendanceDto, user: User) {
    const { batchId, date, records } = payload;
    const dateObj = new Date(date);

    // RBAC: Only ADMINs or the assigned Teacher can mark attendance
    if ((user as any).role !== 'SUPER_ADMIN' && (user as any).role !== 'BRANCH_ADMIN') {
      const today = new Date();
      // Ensure they are marking attendance for today
      if (dateObj.toDateString() !== today.toDateString()) {
        throw new ForbiddenException('Teachers can only mark attendance for today.');
      }

      const currentDayOfWeek = getDayOfWeekFromDate(today);
      const currentTimeStr = today.toTimeString().substring(0, 5); // "HH:mm"

      // Find the active session for this teacher and batch today
      const session = await this.prisma.timetableSession.findFirst({
        where: {
          teacherId: user.id,
          batchId,
          dayOfWeek: currentDayOfWeek,
        }
      });

      if (!session) {
        throw new ForbiddenException('You are not assigned to this class today.');
      }

      // Check time window: startTime to (endTime + 30 mins)
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      };

      const classStart = parseTime(session.startTime);
      const classEnd = parseTime(session.endTime);
      
      // Allow marking up to 30 mins after class ends
      const endWindow = new Date(classEnd.getTime() + 30 * 60000); 

      if (today < classStart || today > endWindow) {
        throw new ForbiddenException(`Attendance marking is locked. Window: ${session.startTime} to ${endWindow.toTimeString().substring(0, 5)}`);
      }
    }

    // Run rapid upserts in a single transaction
    await this.prisma.$transaction(
      records.map(record =>
        this.prisma.attendanceRecord.upsert({
          where: {
            studentId_date_batchId: {
              studentId: record.studentId,
              date: dateObj,
              batchId,
            }
          },
          create: {
            studentId: record.studentId,
            batchId,
            branchId,
            date: dateObj,
            status: record.status,
            remarks: record.remarks,
          },
          update: {
            status: record.status,
            remarks: record.remarks,
          }
        })
      )
    );

    // Invalidate/update cache
    const rollup = await this.calculateRollup(branchId, batchId, dateObj);
    const cacheKey = `attendance_rollup:${branchId}:${batchId}:${date}`;
    await this.redis.set(cacheKey, JSON.stringify(rollup), 'EX', 3600); // 1 hour

    // Emit live update
    this.gateway.emitAttendanceUpdate(branchId, batchId, { date, ...rollup });

    return { success: true, count: records.length };
  }

  /**
   * Retrieves batch attendance statistics. Checks Redis first.
   */
  async getBatchRollup(branchId: string, batchId: string, date: string) {
    const cacheKey = `attendance_rollup:${branchId}:${batchId}:${date}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const dateObj = new Date(date);
    const rollup = await this.calculateRollup(branchId, batchId, dateObj);
    
    await this.redis.set(cacheKey, JSON.stringify(rollup), 'EX', 3600);
    return rollup;
  }

  private async calculateRollup(branchId: string, batchId: string, dateObj: Date) {
    const stats = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        branchId,
        batchId,
        date: dateObj,
      },
      _count: {
        id: true,
      }
    });

    const rollup = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      TOTAL: 0
    };

    stats.forEach(s => {
      rollup[s.status] = s._count.id;
      rollup.TOTAL += s._count.id;
    });

    return rollup;
  }

  async getAttendanceRecords(branchId: string, batchId: string, date: string) {
    const dateObj = new Date(date);
    return this.prisma.attendanceRecord.findMany({
      where: {
        branchId,
        batchId,
        date: dateObj,
      },
      select: {
        studentId: true,
        status: true,
        remarks: true,
        createdAt: true,
      }
    });
  }

  async getTeacherSchedule(teacherId: string, dateStr: string) {
    const dateObj = new Date(dateStr);
    const dayOfWeek = getDayOfWeekFromDate(dateObj);

    return this.prisma.timetableSession.findMany({
      where: {
        teacherId,
        dayOfWeek,
      },
      include: {
        batch: { select: { id: true, name: true } },
        room: { select: { name: true } }
      },
      orderBy: {
        startTime: 'asc'
      }
    });
  }
}
