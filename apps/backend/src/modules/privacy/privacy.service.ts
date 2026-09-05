import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * DPDP Right to Erasure / Data Retention Limit.
   * Runs monthly to hard-delete or anonymize records that have been 
   * soft-deleted for more than 3 years.
   */
  @Cron('0 0 1 * *') // Run at midnight on the first day of every month
  async enforceDataRetentionPolicy() {
    this.logger.log('Starting DPDP Data Retention Enforcement...');

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    try {
      // 1. Delete old Lead data
      const leadResult = await this.prisma.lead.deleteMany({
        where: {
          status: 'LOST',
          updatedAt: {
            lt: threeYearsAgo
          }
        }
      });
      this.logger.log(`Hard deleted ${leadResult.count} old leads.`);

      // 2. Anonymize or Delete old Student data (if soft deletes were implemented)
      // Since student model doesn't explicitly have deletedAt right now, 
      // we'll assume we are targeting students who graduated > 3 years ago if we had a status field.
      // Example implementation for generic anonymization:
      /*
      await this.prisma.student.updateMany({
        where: { deletedAt: { lt: threeYearsAgo } },
        data: {
          firstName: 'Anonymized',
          lastName: 'User',
          dateOfBirth: null,
          gender: null,
          bloodGroup: null,
        }
      });
      */

    } catch (err) {
      this.logger.error('Failed to enforce DPDP data retention policy.', err);
    }
  }

  /**
   * DPDP Data Portability
   * Exports a user's complete PII payload in JSON format.
   */
  async exportStudentPii(studentId: string, branchId: string) {
    this.logger.log(`Exporting PII for student ${studentId}`);
    
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, branchId },
      include: {
        guardians: true,
        enrollments: {
          include: {
            batch: { select: { name: true } }
          }
        },
        attendanceRecords: {
          select: { date: true, status: true, remarks: true }
        },
        examResults: {
          select: { marksObtained: true, remarks: true, subject: { select: { name: true } } }
        }
      }
    });

    if (!student) {
      throw new Error('Student not found or access denied.');
    }

    return {
      personalInfo: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dob,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        address: student.address,
      },
      guardians: student.guardians.map((g: any) => ({
        firstName: g.firstName,
        lastName: g.lastName,
        relation: g.relation,
        phone: g.phone,
        email: g.email
      })),
      enrollments: student.enrollments.map((e: any) => e.batch.name),
      attendanceHistory: student.attendanceRecords,
      examHistory: student.examResults
    };
  }
}
