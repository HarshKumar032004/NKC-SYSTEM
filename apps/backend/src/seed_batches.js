const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const branchId = '7f00f903-9a79-4d9f-a5fb-c9abbef8f92d';
  
  let batches = await prisma.batch.findMany({ where: { branchId } });
  if (batches.length === 0) {
    console.log('No batches found. Creating some...');
    
    // Check for a course to link to, or create one
    let course = await prisma.course.findFirst({ where: { branchId } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          branchId,
          name: 'General Science',
          description: 'Basic science course',
          durationInMonths: 12,
          totalFee: 1500000 // 15000.00 INR
        }
      });
    }

    await prisma.batch.createMany({
      data: [
        { branchId, courseId: course.id, name: 'Morning Batch (2026)', capacity: 50, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
        { branchId, courseId: course.id, name: 'Evening Batch (2026)', capacity: 40, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') }
      ]
    });
    batches = await prisma.batch.findMany({ where: { branchId } });
  }
  
  console.log('Batches:', batches.map(b => ({ id: b.id, name: b.name })));

  await prisma.$disconnect();
}

run();
