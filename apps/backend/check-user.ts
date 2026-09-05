import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'superadmin@nkc.edu.in' }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User found:', user.email);
  console.log('Active:', user.isActive);
  console.log('Password hash format:', user.passwordHash.substring(0, 15) + '...');

  const isValid = await argon2.verify(user.passwordHash, 'SuperAdmin@2026!');
  console.log('Password match:', isValid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
