import { PrismaService } from '../../prisma/prisma.service';
import { LeadStatus, User, AuditAction } from '@prisma/client';
import { LeadStateMachine } from './lead-state-machine';

import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}



  async createLead(branchId: string, data: { name: string; phone: string; email?: string; source?: string }) {
    // Basic least-loaded auto assignment
    const counselors = await this.prisma.user.findMany({
      where: { branchId, role: { name: 'COUNSELOR' }, isActive: true },
      include: {
        _count: {
          select: { assignedLeads: { where: { status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] } } } }
        }
      },
      orderBy: { assignedLeads: { _count: 'asc' } },
      take: 1
    });

    const assignedCounselorId = counselors.length > 0 ? counselors[0].id : null;

    return this.prisma.lead.create({
      data: {
        ...data,
        branchId,
        assignedCounselorId,
        status: LeadStatus.NEW,
      }
    });
  }

  async getLeads(branchId: string, filters?: { search?: string, status?: LeadStatus }) {
    const where: any = { branchId };
    
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: { assignedCounselor: { select: { id: true, email: true } }, followUps: true },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
  }

  async updateLeadStatus(id: string, newStatus: LeadStatus, user: User) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, branchId: user.branchId }
    });

    if (!lead) throw new NotFoundException('Lead not found');

    LeadStateMachine.validateTransition(lead.status, newStatus);

    return this.prisma.lead.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  async logFollowUp(leadId: string, data: { notes: string; contactMethod: string; outcome?: string; nextFollowUpDate?: Date }, user: User) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, branchId: user.branchId }
    });

    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadFollowUp.create({
      data: {
        ...data,
        leadId,
        performedById: user.id
      }
    });
  }

  async convertLeadToStudent(leadId: string, user: User, auditContext?: { ip?: string; userAgent?: string }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, branchId: user.branchId }
    });

    if (!lead) throw new NotFoundException('Lead not found');
    
    LeadStateMachine.validateTransition(lead.status, LeadStatus.CONVERTED);

    let retries = 3;
    while (retries > 0) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 1. Update Lead Status
          const updatedLead = await tx.lead.update({
            where: { id: leadId },
            data: { status: LeadStatus.CONVERTED }
          });

          // 2. Generate Student
          const nameParts = lead.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          const seqKey = `seq:student:${user.branchId}`;
          let seqNumber = await this.redis.incr(seqKey);
          
          if (seqNumber === 1) {
            const dbCount = await tx.student.count({ where: { branchId: user.branchId } });
            await this.redis.set(seqKey, dbCount + 1);
            seqNumber = dbCount + 1;
          }
          
          const enrollmentNumber = `NKC-${user.branchId.substring(0, 4)}-${new Date().getFullYear()}-${seqNumber.toString().padStart(4, '0')}`;

          const student = await tx.student.create({
            data: {
              enrollmentNumber,
              firstName,
              lastName,
              dob: new Date('2000-01-01'), // Placeholder, would prompt user
              gender: 'OTHER',             // Placeholder
              branchId: user.branchId,
              guardians: {
                create: {
                  name: 'Parent Placeholder',
                  relationship: 'Parent',
                  phone: lead.phone,
                  email: lead.email,
                  isPrimary: true
                }
              }
            }
          });

          // 3. Log Audit
          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: AuditAction.CREATE,
              entity: 'Student',
              entityId: student.id,
              newData: JSON.stringify(student),
              ipAddress: auditContext?.ip || null,
              userAgent: auditContext?.userAgent || null,
            }
          });

          return { lead: updatedLead, student };
        });
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('enrollment_number')) {
          retries--;
          if (retries === 0) {
            throw new BadRequestException('System is experiencing high load. Could not generate unique enrollment number. Please try again.');
          }
          // Continue to next iteration to retry
        } else {
          throw error;
        }
      }
    }
  }
}
