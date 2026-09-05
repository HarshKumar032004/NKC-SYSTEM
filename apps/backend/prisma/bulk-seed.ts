import { PrismaClient, Gender, BloodGroup, StudentStatus, AttendanceStatus, FeeStatus, PayrollStatus, InventoryCategory } from '@prisma/client';
import * as argon2 from 'argon2';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function hashPassword(plain: string) {
  return argon2.hash(plain);
}

async function run() {
  console.log('🌱 Starting Bulk Seed (Generating Realistic Data)...');

  const branch = await prisma.branch.findUnique({ where: { code: 'NKC-MAIN' } });
  if (!branch) throw new Error('NKC-MAIN branch not found! Run prisma:seed first.');

  const roleFaculty = await prisma.role.findUnique({ where: { name: 'FACULTY' } });
  const roleStudent = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (!roleFaculty || !roleStudent) throw new Error('Roles not found!');

  const defaultPassword = await hashPassword('Test@1234');

  console.log('  → Generating Subjects & Teachers...');
  // Subjects
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English'];
  const createdSubjects = [];
  for (const s of subjects) {
    const sub = await prisma.subject.upsert({
      where: { branchId_name: { branchId: branch.id, name: s } },
      update: {},
      create: { name: s, branchId: branch.id }
    });
    createdSubjects.push(sub);
  }

  // Teachers
  const teacherProfiles = [];
  for (let i = 0; i < 15; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPassword,
          roleId: roleFaculty.id,
          branchId: branch.id,
          isActive: true,
        }
      });
    }

    const tp = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        branchId: branch.id,
        specialization: faker.helpers.arrayElement(subjects),
        qualification: faker.helpers.arrayElement(["B.Sc", "M.Sc", "Ph.D", "B.Tech"]),
        joiningDate: faker.date.past({ years: 3 }),
        baseSalary: faker.number.int({ min: 4000000, max: 9000000 }), // In paise
      }
    });

    // Payroll Records for the teacher
    await prisma.payrollRecord.createMany({
      data: Array.from({ length: 3 }).map((_, idx) => ({
        teacherId: tp.id,
        branchId: branch.id,
        month: idx + 1, // 1, 2, 3
        year: new Date().getFullYear(),
        amountPaid: faker.number.int({ min: 3000000, max: 5000000 }),
        status: faker.helpers.arrayElement([PayrollStatus.PAID, PayrollStatus.PROCESSED, PayrollStatus.PENDING]),
      }))
    });

    teacherProfiles.push(tp);
  }

  console.log('  → Generating Students, Guardians & Invoices...');
  // Find default course and batch
  let course = await prisma.course.findFirst({ where: { branchId: branch.id } });
  let batch = await prisma.batch.findFirst({ where: { branchId: branch.id } });

  for (let i = 0; i < 150; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Student User Login
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPassword,
          roleId: roleStudent.id,
          branchId: branch.id,
          isActive: true,
        }
      });
    }

    const student = await prisma.student.upsert({
      where: { enrollmentNumber: `NKC-25-${1000 + i}` },
      update: {},
      create: {
        enrollmentNumber: `NKC-25-${1000 + i}`,
        firstName,
        lastName,
        dob: faker.date.birthdate({ min: 18, max: 24, mode: 'age' }),
        gender: faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE]),
        bloodGroup: faker.helpers.arrayElement([BloodGroup.A_POS, BloodGroup.B_POS, BloodGroup.O_POS, BloodGroup.AB_POS]),
        branchId: branch.id,
        status: faker.helpers.arrayElement([StudentStatus.ENROLLED, StudentStatus.ENROLLED, StudentStatus.ENROLLED, StudentStatus.SUSPENDED]),
        address: faker.location.streetAddress(),
        email: email,
        phone: faker.phone.number({ style: 'international' }).substring(0, 20),
        aadharNumber: faker.string.numeric(12),
        admissionDate: faker.date.recent({ days: 100 }),
        previousSchool: faker.company.name() + ' School',
        isHosteler: faker.datatype.boolean(),
        discountPercent: faker.number.int({ min: 0, max: 20 }),
        paymentType: faker.helpers.arrayElement(['LUMP_SUM', 'INSTALLMENT']),
      }
    });

    // Guardian
    await prisma.guardian.create({
      data: {
        studentId: student.id,
        name: faker.person.fullName(),
        relationship: faker.helpers.arrayElement(['Father', 'Mother']),
        phone: faker.phone.number({ style: 'international' }),
        email: faker.internet.email(),
        isPrimary: true,
      }
    });

    if (batch) {
      // Enrollment
      await prisma.enrollment.upsert({
        where: { studentId_batchId: { studentId: student.id, batchId: batch.id } },
        update: {},
        create: {
          studentId: student.id,
          batchId: batch.id,
        }
      });

      // Attendance
      await prisma.attendanceRecord.createMany({
        data: Array.from({ length: 5 }).map((_, idx) => ({
          studentId: student.id,
          batchId: batch.id,
          branchId: branch.id,
          date: faker.date.recent({ days: 30 }),
          status: faker.helpers.arrayElement([AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
        })),
        skipDuplicates: true
      });
    }

    // Fee Invoices
    await prisma.feeInvoice.createMany({
      data: Array.from({ length: 2 }).map((_, idx) => ({
        studentId: student.id,
        invoiceNo: `INV-${student.enrollmentNumber}-${idx}`,
        amount: faker.number.int({ min: 10000, max: 50000 }), // In Rs (wait, it's decimal)
        dueDate: faker.date.soon({ days: 30 }),
        status: faker.helpers.arrayElement([FeeStatus.PAID, FeeStatus.PENDING, FeeStatus.OVERDUE]),
        description: faker.helpers.arrayElement(['Tuition Fee', 'Library Fee', 'Transport Fee'])
      }))
    });
  }

  console.log('  → Generating Inventory...');
  for (let i = 0; i < 20; i++) {
    await prisma.inventoryItem.create({
      data: {
        branchId: branch.id,
        sku: `SKU-${faker.string.alphanumeric(6).toUpperCase()}`,
        name: faker.commerce.productName(),
        category: faker.helpers.arrayElement([InventoryCategory.BOOK, InventoryCategory.UNIFORM, InventoryCategory.MERCH]),
        stockQuantity: faker.number.int({ min: 10, max: 500 }),
        minStockThreshold: 20,
        price: faker.number.int({ min: 50000, max: 200000 }), // paise
      }
    });
  }

  console.log('✅ Bulk Seed Complete! You now have a ton of realistic data.');
}

run()
  .catch((e) => {
    console.error('❌ Bulk Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
