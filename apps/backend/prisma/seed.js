"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
// ─── Constants ────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;
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
];
const ACTIONS = ['create', 'read', 'update', 'delete', 'export'];
// ─── Role definitions: which resource.action each role may use ────────────────
const ROLE_PERMISSIONS = {
    SUPER_ADMIN: RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}`)),
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
async function hashPassword(plain) {
    return bcrypt.hash(plain, SALT_ROUNDS);
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
    const created = {};
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
    const created = {};
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
async function seedRolePermissions(roleIds, permIds) {
    console.log('  → Wiring role-permissions...');
    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
        const roleId = roleIds[roleName];
        if (!roleId)
            continue;
        for (const key of permKeys) {
            const permissionId = permIds[key];
            if (!permissionId)
                continue;
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
async function seedUsers(branchId, roleIds) {
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
    const created = {};
    for (const u of users) {
        const roleId = roleIds[u.roleName];
        if (!roleId)
            continue;
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
async function seedCourseAndBatch(branchId) {
    console.log('  → Seeding sample course & batch...');
    const course = await prisma.course.upsert({
        where: { branchId_code: { branchId, code: 'BCA-101' } },
        update: {},
        create: {
            branchId,
            code: 'BCA-101',
            name: 'Bachelor of Computer Applications',
            credits: 120,
            semester: 1,
            description: 'Full-stack software development curriculum.',
        },
    });
    const batch = await prisma.batch.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            courseId: course.id,
            branchId,
            name: 'BCA-2025-A',
            capacity: 60,
            startDate: new Date('2025-07-01'),
            endDate: new Date('2026-04-30'),
        },
    });
    console.log(`     ✓ Course: ${course.code} — ${course.name}`);
    console.log(`     ✓ Batch: ${batch.name}`);
    return { course, batch };
}
// ─── Seed Sample Student ──────────────────────────────────────────────────────
async function seedStudent(branchId) {
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
