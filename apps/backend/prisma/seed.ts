/**
 * NKC IMS — Prisma Seed Script
 *
 * Seeds:
 *  1. Default Roles (SUPER_ADMIN, BRANCH_ADMIN, FACULTY, STUDENT, STAFF)
 *  2. Default Permissions (CRUD per resource)
 *  3. Role ↔ Permission mappings
 *  4. Sample Branch (NKC Main Campus)
 *  5. Root Super Admin user
 *  6. Sample Faculty + Student users
 *
 * Run: pnpm --filter @nkc/backend prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCES = [
  'branches',
  'users',
  'roles',
  'students',
  'guardians',
  'courses',
  'batches',
  'enrollments',
  'attendance',
  'grades',
  'fees',
  'notices',
  'reports',
  'audit_logs',
] as const;

const ACTIONS = ['create', 'read', 'update', 'delete', 'export'] as const;

type Resource = (typeof RESOURCES)[number];
type Action = (typeof ACTIONS)[number];

// ─── Role definitions: which resource.action each role may use ────────────────

const ROLE_PERMISSIONS: Record<string, Array<`${Resource}:${Action}`>> = {
  SUPER_ADMIN: RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}` as `${Resource}:${Action}`)),

  BRANCH_ADMIN: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'students:create', 'students:read', 'students:update', 'students:delete',
    'guardians:create', 'guardians:read', 'guardians:update', 'guardians:delete',
    'courses:create', 'courses:read', 'courses:update', 'courses:delete',
    'batches:create', 'batches:read', 'batches:update', 'batches:delete',
    'enrollments:create', 'enrollments:read', 'enrollments:update', 'enrollments:delete',
    'attendance:create', 'attendance:read', 'attendance:update',
    'grades:create', 'grades:read', 'grades:update',
    'fees:create', 'fees:read', 'fees:update',
    'notices:create', 'notices:read', 'notices:update', 'notices:delete',
    'reports:read', 'reports:export',
    'audit_logs:read',
  ],

  FACULTY: [
    'students:read',
    'attendance:create', 'attendance:read', 'attendance:update',
    'grades:create', 'grades:read', 'grades:update',
    'courses:read',
    'batches:read',
    'notices:read', 'notices:create',
    'reports:read',
  ],

  STAFF: [
    'students:read', 'students:update',
    'fees:create', 'fees:read', 'fees:update',
    'notices:read',
    'reports:read',
  ],

  STUDENT: [
    'students:read',
    'attendance:read',
    'grades:read',
    'fees:read',
    'notices:read',
    'courses:read',
    'batches:read',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

// ─── Seed Roles ───────────────────────────────────────────────────────────────

async function seedRoles() {
  console.log('  → Seeding roles...');
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access across all branches', isSystem: true },
    { name: 'BRANCH_ADMIN', description: 'Full access within assigned branch', isSystem: true },
    { name: 'FACULTY', description: 'Teaching staff access', isSystem: true },
    { name: 'STAFF', description: 'Administrative staff access', isSystem: true },
    { name: 'STUDENT', description: 'Student read-only access', isSystem: true },
  ];

  const created: Record<string, string> = {};
  for (const role of roles) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    created[r.name] = r.id;
    console.log(`     ✓ Role: ${r.name}`);
  }
  return created;
}

// ─── Seed Permissions ─────────────────────────────────────────────────────────

async function seedPermissions() {
  console.log('  → Seeding permissions...');
  const created: Record<string, string> = {};

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const p = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: {
          resource,
          action,
          description: `${action} on ${resource}`,
        },
      });
      created[`${resource}:${action}`] = p.id;
    }
  }

  console.log(`     ✓ ${Object.keys(created).length} permissions upserted`);
  return created;
}

// ─── Wire Role ↔ Permissions ──────────────────────────────────────────────────

async function seedRolePermissions(
  roleIds: Record<string, string>,
  permIds: Record<string, string>,
) {
  console.log('  → Wiring role-permissions...');

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;

    for (const key of permKeys) {
      const permissionId = permIds[key];
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
    console.log(`     ✓ ${roleName}: ${permKeys.length} permissions assigned`);
  }
}

// ─── Seed Branch ──────────────────────────────────────────────────────────────

async function seedBranch() {
  console.log('  → Seeding sample branch...');
  const branch = await prisma.branch.upsert({
    where: { code: 'NKC-MAIN' },
    update: {},
    create: {
      name: 'NKC Main Campus',
      code: 'NKC-MAIN',
      address: '123 Education Road, Knowledge City, KN 400001',
      contactPhone: '+91-9800000001',
      email: 'admin@nkc.edu.in',
      hostelFee: 50000.00,
      messFee: 30000.00,
      settings: {
        academicYear: '2025-2026',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      },
    },
  });
  console.log(`     ✓ Branch: ${branch.name} (${branch.code})`);
  return branch;
}

// ─── Seed Users ───────────────────────────────────────────────────────────────

async function seedUsers(
  branchId: string,
  roleIds: Record<string, string>,
) {
  console.log('  → Seeding users...');

  const users = [
    {
      email: 'superadmin@nkc.edu.in',
      password: 'SuperAdmin@2026!',
      roleName: 'SUPER_ADMIN',
      label: 'Root Super Admin',
    },
    {
      email: 'branchadmin@nkc.edu.in',
      password: 'BranchAdmin@2026!',
      roleName: 'BRANCH_ADMIN',
      label: 'Branch Admin',
    },
    {
      email: 'faculty@nkc.edu.in',
      password: 'FacultyUser@2026!',
      roleName: 'FACULTY',
      label: 'Sample Faculty',
    },
    {
      email: 'student@nkc.edu.in',
      password: 'StudentUser@2026!',
      roleName: 'STUDENT',
      label: 'Sample Student',
    },
  ];

  const created: Record<string, string> = {};
  for (const u of users) {
    const roleId = roleIds[u.roleName];
    if (!roleId) continue;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: await hashPassword(u.password),
        roleId,
        branchId,
        isActive: true,
      },
    });
    created[u.roleName] = user.id;
    console.log(`     ✓ ${u.label}: ${u.email}`);
  }
  return created;
}

// ─── Seed Sample Course + Batch ───────────────────────────────────────────────

async function seedCourseAndBatch(branchId: string) {
  console.log('  → Seeding courses & batches...');

  const courseList = [
    { code: 'CLS-07', name: 'Class 7th', baseFee: 40000 },
    { code: 'CLS-08', name: 'Class 8th', baseFee: 45000 },
    { code: 'CLS-09', name: 'Class 9th', baseFee: 50000 },
    { code: 'CLS-10', name: 'Class 10th', baseFee: 55000 },
    { code: 'CLS-11', name: 'Class 11th', baseFee: 65000 },
    { code: 'CLS-12', name: 'Class 12th', baseFee: 75000 },
    { code: 'NEET', name: 'NEET Target', baseFee: 120000 },
    { code: 'JEE', name: 'JEE Target', baseFee: 130000 },
  ];

  const courses = [];
  for (const c of courseList) {
    const course = await prisma.course.upsert({
      where: { branchId_code: { branchId, code: c.code } },
      update: {},
      create: {
        branchId,
        code: c.code,
        name: c.name,
        credits: 120,
        semester: 1,
        description: `Curriculum for ${c.name}.`,
        baseFee: c.baseFee
      },
    });
    courses.push(course);
    console.log(`     ✓ Course: ${course.code} — ${course.name}`);
  }

  // Create one batch for the first course just to satisfy relationships
  const batch = await prisma.batch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      courseId: courses[0].id,
      branchId,
      name: `${courses[0].code}-2025-A`,
      capacity: 60,
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-04-30'),
    },
  });

  console.log(`     ✓ Batch: ${batch.name}`);
  return { courses, batch };
}

// ─── Seed Sample Student ──────────────────────────────────────────────────────

async function seedStudent(branchId: string) {
  console.log('  → Seeding sample student profile...');

  const student = await prisma.student.upsert({
    where: { enrollmentNumber: 'NKC-2025-0001' },
    update: {},
    create: {
      enrollmentNumber: 'NKC-2025-0001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dob: new Date('2005-03-15'),
      gender: 'MALE',
      bloodGroup: 'B_POS',
      branchId,
      status: 'ENROLLED',
      address: '45 Shivaji Nagar, Pune, MH 411005',
    },
  });

  await prisma.guardian.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      studentId: student.id,
      name: 'Ramesh Sharma',
      relationship: 'Father',
      phone: '+91-9811234567',
      email: 'ramesh.sharma@email.com',
      occupation: 'Engineer',
      isPrimary: true,
    },
  });

  console.log(`     ✓ Student: ${student.firstName} ${student.lastName} (${student.enrollmentNumber})`);
  return student;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Starting NKC IMS seed...\n');

  const roleIds = await seedRoles();
  const permIds = await seedPermissions();
  await seedRolePermissions(roleIds, permIds);
  const branch = await seedBranch();
  await seedUsers(branch.id, roleIds);
  await seedCourseAndBatch(branch.id);
  await seedStudent(branch.id);

  console.log('\n✅ Seed complete.\n');
  console.log('  Default credentials:');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │  superadmin@nkc.edu.in   /  SuperAdmin@2026!            │');
  console.log('  │  branchadmin@nkc.edu.in  /  BranchAdmin@2026!           │');
  console.log('  │  faculty@nkc.edu.in      /  FacultyUser@2026!           │');
  console.log('  │  student@nkc.edu.in      /  StudentUser@2026!           │');
  console.log('  └─────────────────────────────────────────────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
