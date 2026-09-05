import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollStatus, DayOfWeek } from '@prisma/client';
import { parse, differenceInMinutes, getDaysInMonth, getDay } from 'date-fns';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate total minutes a teacher is scheduled to teach in a given month.
   */
  async getTeacherWorkload(teacherId: string, branchId: string, month: number, year: number): Promise<number> {
    const sessions = await this.prisma.timetableSession.findMany({
      where: { teacherId, branchId },
    });

    if (!sessions.length) return 0;

    let totalMinutes = 0;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));

    // Map Prisma DayOfWeek enum to JS getDay() integer (0=Sun, 1=Mon, ..., 6=Sat)
    const dayMap: Record<DayOfWeek, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    // Calculate occurrences of each day of week in the given month
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      dayCounts[getDay(date)]++;
    }

    sessions.forEach((session) => {
      const start = parse(session.startTime, 'HH:mm', new Date());
      const end = parse(session.endTime, 'HH:mm', new Date());
      
      const durationMinutes = differenceInMinutes(end, start);
      if (durationMinutes > 0) {
        const jsDay = dayMap[session.dayOfWeek];
        const occurrences = dayCounts[jsDay];
        totalMinutes += (durationMinutes * occurrences);
      }
    });

    return totalMinutes;
  }

  /**
   * Automatically calculate and generate payroll records for all teachers for a specific month.
   */
  async generatePayroll(branchId: string, month: number, year: number) {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: { branchId, user: { isActive: true } },
    });

    let processedCount = 0;

    for (const teacher of teachers) {
      // Check if payroll already exists
      const existing = await this.prisma.payrollRecord.findUnique({
        where: {
          teacherId_month_year: { teacherId: teacher.id, month, year }
        }
      });

      if (existing && existing.status !== PayrollStatus.PENDING) {
        continue; // Skip already processed/paid
      }

      let amountPaid = teacher.baseSalary; // Base salary logic (per month)

      if (teacher.hourlyRate > 0) {
        // Hourly rate logic
        const totalMinutes = await this.getTeacherWorkload(teacher.id, branchId, month, year);
        amountPaid = Math.floor((totalMinutes / 60) * teacher.hourlyRate);
      }

      const payrollData = {
        teacherId: teacher.id,
        branchId,
        month,
        year,
        amountPaid,
        bonus: 0,
        deductions: 0,
        status: PayrollStatus.PENDING,
      };

      if (existing) {
        await this.prisma.payrollRecord.update({
          where: { id: existing.id },
          data: payrollData,
        });
      } else {
        await this.prisma.payrollRecord.create({
          data: payrollData,
        });
      }
      processedCount++;
    }

    return { processedCount, message: `Successfully generated payroll for ${processedCount} teachers.` };
  }

  /**
   * Get list of teacher profiles
   */
  async getTeachers(branchId: string) {
    return this.prisma.teacherProfile.findMany({
      where: { branchId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        teacherSubjects: {
          include: { subject: true }
        }
      }
    });
  }

  /**
   * Create a new teacher (creates User and TeacherProfile)
   */
  async createTeacher(branchId: string, data: any) {
    // 1. Get the TEACHER role
    const role = await this.prisma.role.findUnique({
      where: { name: 'TEACHER' } // Ensure your DB uses 'TEACHER' as role name
    });

    if (!role) {
      throw new BadRequestException('Teacher role not found in system.');
    }

    return this.prisma.$transaction(async (tx) => {
      let user = null;

      if (data.createAccount) {
        if (!data.email || !data.password) {
          throw new BadRequestException('Email and password are required to create an account.');
        }
        const argon2 = require('argon2');
        const passwordHash = await argon2.hash(data.password);

        user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            roleId: role.id,
            branchId,
            isActive: true
          }
        });
      }

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user?.id || null,
          branchId,
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          specialization: data.specialization || null,
          baseSalary: data.baseSalary || 0,
          hourlyRate: data.hourlyRate || 0,
          joiningDate: new Date(),
        }
      });

      return { user, teacherProfile };
    });
  }

  /**
   * Get specific teacher details
   */
  async getTeacherById(branchId: string, id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id, branchId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        teacherSubjects: {
          include: { subject: true }
        },
        payrollRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      }
    });

    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  /**
   * Update a payroll record (bonus, deductions, status)
   */
  async updatePayrollRecord(branchId: string, id: string, data: { bonus?: number; deductions?: number; status?: PayrollStatus }) {
    const payroll = await this.prisma.payrollRecord.findUnique({
      where: { id, branchId }
    });
    
    if (!payroll) throw new NotFoundException('Payroll record not found');

    const updateData: any = { ...data };
    if (data.status === PayrollStatus.PAID && payroll.status !== PayrollStatus.PAID) {
      updateData.paymentDate = new Date();
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: updateData
    });
  }
}
