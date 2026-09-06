import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  const branchId = '7f00f903-9a79-4d9f-a5fb-c9abbef8f92d';
  console.log('Testing concurrent KPI queries for branch:', branchId);
  
  console.time('Total Execution Time');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const currentDay = days[new Date().getDay()] as any;

  try {
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
      prisma.$queryRaw`SELECT * FROM mv_branch_financial_summary WHERE branch_id = ${branchId}::uuid ORDER BY month ASC LIMIT 12;`,
      prisma.$queryRaw`SELECT * FROM mv_academic_funnel WHERE branch_id = ${branchId}::uuid;`,
      prisma.$queryRaw`SELECT * FROM mv_attendance_trends WHERE branch_id = ${branchId}::uuid ORDER BY week ASC LIMIT 12;`,
      prisma.student.count({ where: { branchId, status: 'ENROLLED' } }),
      prisma.lead.count({ where: { branchId, status: { in: ['NEW', 'CONTACTED'] } } }),
      prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PAID', paidDate: { gte: startOfMonth } } }),
      prisma.exam.findMany({ where: { branchId, examDate: { gte: new Date() }, status: 'SCHEDULED' }, orderBy: { examDate: 'asc' }, take: 3, include: { batch: true } }),
      prisma.timetableSession.findMany({ where: { branchId, dayOfWeek: currentDay }, orderBy: { startTime: 'asc' }, include: { batch: true, teacher: true, room: true } }),
      prisma.feeInvoice.findMany({ where: { student: { branchId }, status: 'PENDING' }, orderBy: { amount: 'desc' }, take: 5, include: { student: true } }),
      prisma.notice.findMany({ orderBy: { publishedAt: 'desc' }, take: 3 }),
      prisma.student.findMany({ where: { branchId, status: 'ENROLLED' }, orderBy: { admissionDate: 'desc' }, take: 5, include: { enrollments: { include: { batch: true } } } })
    ]);
    
    console.timeEnd('Total Execution Time');
    console.log(`Success! Fired 11 concurrent queries.`);
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
