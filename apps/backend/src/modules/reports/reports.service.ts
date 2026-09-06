import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('data-export') private readonly exportQueue: Queue
  ) {}

  async getDashboardKpis(branchId: string) {
    // Ideally use Redis to cache these results for 15 minutes.
    // Assuming materialized views are already populated.
    // Fallback to empty arrays if views are empty.
    
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const currentDay = days[new Date().getDay()] as any;

      const [
        financialSummary,
        academicFunnel,
        attendanceTrends,
        totalStudents,
        activeLeads,
        feeInvoices,
        upcomingExams,
        todayClasses,
        pendingFees,
        recentNotices,
        recentAdmissions
      ] = await Promise.all([
        this.prisma.$queryRaw`SELECT * FROM mv_branch_financial_summary WHERE branch_id = ${branchId}::uuid ORDER BY month ASC LIMIT 12;`,
        this.prisma.$queryRaw`SELECT * FROM mv_academic_funnel WHERE branch_id = ${branchId}::uuid;`,
        this.prisma.$queryRaw`SELECT * FROM mv_attendance_trends WHERE branch_id = ${branchId}::uuid ORDER BY week ASC LIMIT 12;`,
        this.prisma.student.count({ where: { branchId, status: 'ENROLLED' } }),
        this.prisma.lead.count({ where: { branchId, status: { in: ['NEW', 'CONTACTED'] } } }),
        this.prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PAID', paidDate: { gte: startOfMonth } } }),
        this.prisma.exam.findMany({ where: { branchId, examDate: { gte: new Date() }, status: 'SCHEDULED' }, orderBy: { examDate: 'asc' }, take: 3, include: { batch: true } }),
        this.prisma.timetableSession.findMany({ where: { branchId, dayOfWeek: currentDay }, orderBy: { startTime: 'asc' }, include: { batch: true, teacher: true, room: true } }),
        this.prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PENDING' }, orderBy: { amount: 'desc' }, take: 5, include: { student: true } }),
        this.prisma.notice.findMany({ orderBy: { publishedAt: 'desc' }, take: 3 }),
        this.prisma.student.findMany({ where: { branchId, status: 'ENROLLED' }, orderBy: { admissionDate: 'desc' }, take: 5, include: { enrollments: { include: { batch: true } } } })
      ]);

      const revenueThisMonth = feeInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

      return {
        financialSummary,
        academicFunnel,
        attendanceTrends,
        realtime: {
          totalStudents,
          activeLeads,
          revenueThisMonth,
          upcomingExams,
          todayClasses,
          pendingFees,
          recentNotices,
          recentAdmissions
        }
      };
    } catch (err) {
      this.logger.error('Failed to query KPIs. Ensure materialized views are created.', err);
      // Fallback for UI during dev if view is not migrated yet
      
      // We still want to return real-time stats even if views fail
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const currentDay = days[new Date().getDay()] as any;

        const [
          totalStudents,
          activeLeads,
          feeInvoices,
          upcomingExams,
          todayClasses,
          pendingFees,
          recentNotices,
          recentAdmissions
        ] = await Promise.all([
          this.prisma.student.count({ where: { branchId, status: 'ENROLLED' } }),
          this.prisma.lead.count({ where: { branchId, status: { in: ['NEW', 'CONTACTED'] } } }),
          this.prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PAID', paidDate: { gte: startOfMonth } } }),
          this.prisma.exam.findMany({ where: { branchId, examDate: { gte: new Date() }, status: 'SCHEDULED' }, orderBy: { examDate: 'asc' }, take: 3, include: { batch: true } }),
          this.prisma.timetableSession.findMany({ where: { branchId, dayOfWeek: currentDay }, orderBy: { startTime: 'asc' }, include: { batch: true, teacher: true, room: true } }),
          this.prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PENDING' }, orderBy: { amount: 'desc' }, take: 5, include: { student: true } }),
          this.prisma.notice.findMany({ orderBy: { publishedAt: 'desc' }, take: 3 }),
          this.prisma.student.findMany({ where: { branchId, status: 'ENROLLED' }, orderBy: { admissionDate: 'desc' }, take: 5, include: { enrollments: { include: { batch: true } } } })
        ]);

        const revenueThisMonth = feeInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        return {
          financialSummary: [],
          academicFunnel: [],
          attendanceTrends: [],
          realtime: {
            totalStudents,
            activeLeads,
            revenueThisMonth,
            upcomingExams,
            todayClasses,
            pendingFees,
            recentNotices,
            recentAdmissions
          }
        };
      } catch (innerErr) {
        return {
          financialSummary: [],
          academicFunnel: [],
          attendanceTrends: [],
          realtime: {
            totalStudents: 0,
            activeLeads: 0,
            revenueThisMonth: 0,
            upcomingExams: [],
            todayClasses: [],
            pendingFees: [],
            recentNotices: [],
            recentAdmissions: []
          }
        };
      }
    }
  }

  async triggerDataExport(payload: any) {
    this.logger.log(`Queueing data export for user ${payload.userId}`);
    await this.exportQueue.add('export-job', payload);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshMaterializedViews() {
    this.logger.log('Starting hourly refresh of materialized views...');
    try {
      // Check if views exist before trying to refresh to prevent noisy errors
      const result: { matviewname: string }[] = await this.prisma.$queryRawUnsafe(`
        SELECT matviewname FROM pg_matviews WHERE matviewname = 'mv_branch_financial_summary';
      `);
      
      if (result.length === 0) {
        this.logger.warn('Materialized views do not exist yet. Skipping refresh.');
        return;
      }

      // CONCURRENTLY requires a unique index on the materialized view
      await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_branch_financial_summary;`);
      await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_academic_funnel;`);
      await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_attendance_trends;`);
      this.logger.log('Materialized views refreshed successfully.');
    } catch (err: any) {
      if (err.code === 'P2010' && err.message.includes('42P01')) {
        this.logger.warn('Materialized views missing (42P01). Run migrations.');
      } else {
        this.logger.error('Failed to refresh materialized views.', err);
      }
    }
  }
}
