const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.student.count();
  console.log('Total students:', count);
}
main().finally(() => prisma.$disconnect());
