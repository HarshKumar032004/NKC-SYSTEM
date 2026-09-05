import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

const tenantAls = new AsyncLocalStorage<{ branchId?: string; bypassRls?: boolean }>();

async function main() {
  const basePrisma = new PrismaClient();
  const prisma = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const context = tenantAls.getStore();
          if (context?.branchId) {
            await basePrisma.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${context.branchId}'`);
          }
          return query(args);
        }
      }
    }
  }) as unknown as PrismaClient;

  await prisma.$connect();

  console.log('Testing RLS policies...');

  // Setup mock branches
  const branchA = await basePrisma.branch.upsert({
    where: { code: 'RLS-A' },
    update: {},
    create: { id: 'branch-a', name: 'RLS Branch A', code: 'RLS-A' }
  });

  const branchB = await basePrisma.branch.upsert({
    where: { code: 'RLS-B' },
    update: {},
    create: { id: 'branch-b', name: 'RLS Branch B', code: 'RLS-B' }
  });

  // Setup mock batches
  await basePrisma.batch.upsert({
    where: { id: 'batch-a' },
    update: {},
    create: { id: 'batch-a', name: 'Batch A', branchId: branchA.id }
  });

  await basePrisma.batch.upsert({
    where: { id: 'batch-b' },
    update: {},
    create: { id: 'batch-b', name: 'Batch B', branchId: branchB.id }
  });

  // Test Branch A access
  await tenantAls.run({ branchId: branchA.id }, async () => {
    const batches = await prisma.batch.findMany();
    if (batches.some(b => b.branchId !== branchA.id)) {
      console.error('❌ RLS Test Failed: Branch A accessed Branch B data.');
      process.exit(1);
    }
    console.log('✅ Branch A isolated successfully.');
  });

  // Test Branch B access
  await tenantAls.run({ branchId: branchB.id }, async () => {
    const batches = await prisma.batch.findMany();
    if (batches.some(b => b.branchId !== branchB.id)) {
      console.error('❌ RLS Test Failed: Branch B accessed Branch A data.');
      process.exit(1);
    }
    console.log('✅ Branch B isolated successfully.');
  });

  // Test SUPER_ADMIN bypass
  await tenantAls.run({ bypassRls: true }, async () => {
    const batches = await prisma.batch.findMany();
    // A super admin should see batches from both Branch A and Branch B
    const hasBranchA = batches.some(b => b.branchId === branchA.id);
    const hasBranchB = batches.some(b => b.branchId === branchB.id);
    if (!hasBranchA || !hasBranchB) {
      console.error('❌ RLS Test Failed: SUPER_ADMIN bypass did not return data from all branches.');
      process.exit(1);
    }
    console.log('✅ SUPER_ADMIN bypass validated successfully.');
  });

  console.log('✅ All RLS Isolation tests passed.');
  await basePrisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
