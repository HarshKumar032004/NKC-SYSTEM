const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const branchId = '7f00f903-9a79-4d9f-a5fb-c9abbef8f92d';
  
  // Create some dummy rooms if none exist
  let rooms = await prisma.room.findMany({ where: { branchId } });
  if (rooms.length === 0) {
    console.log('No rooms found. Creating some...');
    await prisma.room.createMany({
      data: [
        { branchId, name: 'Room 101', capacity: 30,},
        { branchId, name: 'Room 102', capacity: 40,},
        { branchId, name: 'Lab A', capacity: 20,},
      ]
    });
    rooms = await prisma.room.findMany({ where: { branchId } });
  }
  
  console.log('Rooms:', rooms.map(r => ({ id: r.id, name: r.name })));

  const teachers = await prisma.teacherProfile.findMany({
    where: { branchId },
    include: { user: true }
  });
  console.log('Teachers:', teachers.map(t => ({ id: t.user.id, email: t.user.email })));

  await prisma.$disconnect();
}

run();
