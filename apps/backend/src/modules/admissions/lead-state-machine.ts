import { LeadStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

const StateTransitions: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.DEMO_SCHEDULED, LeadStatus.COUNSELED, LeadStatus.LOST],
  [LeadStatus.DEMO_SCHEDULED]: [LeadStatus.COUNSELED, LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.COUNSELED]: [LeadStatus.ADMISSION_PENDING, LeadStatus.LOST, LeadStatus.CONTACTED],
  [LeadStatus.ADMISSION_PENDING]: [LeadStatus.CONVERTED, LeadStatus.LOST, LeadStatus.COUNSELED],
  [LeadStatus.CONVERTED]: [], // Terminal state
  [LeadStatus.LOST]: [LeadStatus.NEW], // Can be resurrected
};

export class LeadStateMachine {
  static validateTransition(currentStatus: LeadStatus, newStatus: LeadStatus): void {
    if (currentStatus === newStatus) return; // No-op

    const allowedTransitions = StateTransitions[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}
