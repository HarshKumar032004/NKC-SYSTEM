import { Injectable } from '@nestjs/common';
// @ts-ignore
import { AbilityBuilder } from '@casl/ability';
// @ts-ignore
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Action } from './action.enum';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Use @casl/prisma Subjects helper to extract all Prisma models as subjects
type AppSubjects = 'all' | Subjects<{
  User: Prisma.UserDelegate;
  Role: Prisma.RoleDelegate;
  Permission: Prisma.PermissionDelegate;
  RolePermission: Prisma.RolePermissionDelegate;
  Branch: Prisma.BranchDelegate;
  Lead: Prisma.LeadDelegate;
  LeadFollowUp: Prisma.LeadFollowUpDelegate;
  Student: Prisma.StudentDelegate;
  Document: Prisma.DocumentDelegate;
  Guardian: Prisma.GuardianDelegate;
  Course: Prisma.CourseDelegate;
  Batch: Prisma.BatchDelegate;
  Enrollment: Prisma.EnrollmentDelegate;
  AttendanceRecord: Prisma.AttendanceRecordDelegate;
  Exam: Prisma.ExamDelegate;
  ExamSubject: Prisma.ExamSubjectDelegate;
  ExamResult: Prisma.ExamResultDelegate;
  GradeScale: Prisma.GradeScaleDelegate;
  FeeInvoice: Prisma.FeeInvoiceDelegate;
  FeeStructure: Prisma.FeeStructureDelegate;
  FeeInstallment: Prisma.FeeInstallmentDelegate;
  PaymentTransaction: Prisma.PaymentTransactionDelegate;
  Receipt: Prisma.ReceiptDelegate;
  Room: Prisma.RoomDelegate;
  TimetableSession: Prisma.TimetableSessionDelegate;
  Notice: Prisma.NoticeDelegate;
  Notification: Prisma.NotificationDelegate;
  NotificationTemplate: Prisma.NotificationTemplateDelegate;
  Subject: Prisma.SubjectDelegate;
  TeacherProfile: Prisma.TeacherProfileDelegate;
  TeacherSubject: Prisma.TeacherSubjectDelegate;
  PayrollRecord: Prisma.PayrollRecordDelegate;
  InventoryItem: Prisma.InventoryItemDelegate;
  StockTransaction: Prisma.StockTransactionDelegate;
  MaterialIssue: Prisma.MaterialIssueDelegate;
  AuditLog: Prisma.AuditLogDelegate;
}>;

export type AppAbility = ReturnType<typeof createPrismaAbility<[Action | string, AppSubjects]>>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

  async createForUser(user: JwtPayload): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    if (user.role === 'SUPER_ADMIN') {
      // 10.2: SuperAdmin bypasses branch isolation by design.
      // NOTE: Ensure SuperAdmin accounts are audited quarterly.
      // MFA must be strictly enforced via Auth/Identity provider for all SUPER_ADMIN accounts.
      can('manage', 'all');
    } else {
      // Query role permissions from database
      const roleData = await this.prisma.role.findUnique({
        where: { name: user.role },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      if (roleData) {
        for (const rolePerm of roleData.permissions) {
          const action = rolePerm.permission.action as Action;
          const resourceString = rolePerm.permission.resource;
          
          // Map DB resource strings (plural, lowercase) to CASL Subjects (PascalCase singular)
          const resourceMap: Record<string, string> = {
            'users': 'User',
            'roles': 'Role',
            'permissions': 'Permission',
            'branches': 'Branch',
            'students': 'Student',
            'guardians': 'Guardian',
            'documents': 'Document',
            'courses': 'Course',
            'batches': 'Batch',
            'enrollments': 'Enrollment',
            'attendance': 'AttendanceRecord',
            'grades': 'ExamResult',
            'fees': 'FeeInvoice',
            'notices': 'Notice',
            'audit_logs': 'AuditLog',
          };
          
          const mappedResource = resourceMap[resourceString] || resourceString;
          const resource = mappedResource as Exclude<AppSubjects, 'all'>;

          // Tenant Isolation: Attach branchId for isolated access
          // We omit 'Branch' entity itself from branch isolation to avoid circular edge cases 
          // or we can allow them to read their own branch
          if (resource === 'Branch') {
            can(action, resource, { id: user.branchId } as any);
          } else {
            can(action, resource, { branchId: user.branchId } as any);
          }
        }
      }
    }

    return build();
  }
}
