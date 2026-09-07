import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory, ExpenseStatus, PaymentMethod, User } from '@prisma/client';

export class CreateExpenseDto {
  title!: string;
  category!: ExpenseCategory;
  amount!: number;
  paymentMode!: PaymentMethod;
  explanation?: string;
  branchId!: string;
}

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string, search?: string, status?: ExpenseStatus) {
    const where: any = { branchId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { explanation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.maintenanceExpense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateExpenseDto, user: User) {
    // Basic RBAC
    if ((user as any).role !== 'SUPER_ADMIN' && (user as any).role !== 'BRANCH_ADMIN') {
      throw new ForbiddenException('You do not have permission to log expenses.');
    }

    const activeBranchId = (user as any).role === 'SUPER_ADMIN' ? dto.branchId : user.branchId;

    return this.prisma.maintenanceExpense.create({
      data: {
        title: dto.title,
        category: dto.category,
        amount: dto.amount,
        paymentMode: dto.paymentMode,
        explanation: dto.explanation,
        branchId: activeBranchId,
      },
    });
  }

  async resolveExpense(id: string, branchId: string, user: User) {
    if ((user as any).role !== 'SUPER_ADMIN' && (user as any).role !== 'BRANCH_ADMIN') {
      throw new ForbiddenException('You do not have permission to resolve expenses.');
    }

    const expense = await this.prisma.maintenanceExpense.findUnique({
      where: { id },
    });

    if (!expense || ((user as any).role !== 'SUPER_ADMIN' && expense.branchId !== user.branchId)) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.maintenanceExpense.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }
}
