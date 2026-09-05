import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'superadmin@nkc.edu.in', password: 'SuperAdmin@2026!' },
    { email: 'branchadmin@nkc.edu.in', password: 'BranchAdmin@2026!' },
    { email: 'faculty@nkc.edu.in', password: 'FacultyUser@2026!' },
    { email: 'student@nkc.edu.in', password: 'StudentUser@2026!' }
  ];

  for (const u of users) {
    const hash = await argon2.hash(u.password);
    const user = await prisma.user.update({
      where: { email: u.email },
      data: { passwordHash: hash }
    });
    console.log('✅ Updated password for', user.email);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
