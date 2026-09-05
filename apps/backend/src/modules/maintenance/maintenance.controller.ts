import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService, CreateExpenseDto } from './maintenance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, ExpenseStatus } from '@prisma/client';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  async findAll(
    @Query('branchId') branchId: string,
    @Query('search') search: string,
    @Query('status') status: ExpenseStatus,
    @CurrentUser() user: User
  ) {
    const activeBranchId = (user as any).role === 'SUPER_ADMIN' && branchId ? branchId : user.branchId;
    return this.maintenanceService.findAll(activeBranchId, search, status);
  }

  @Post()
  async create(@Body() dto: CreateExpenseDto, @CurrentUser() user: User) {
    // Override branchId if not super admin
    if ((user as any).role !== 'SUPER_ADMIN') {
      dto.branchId = user.branchId;
    }
    return this.maintenanceService.create(dto, user);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Query('branchId') branchId: string,
    @CurrentUser() user: User
  ) {
    const activeBranchId = (user as any).role === 'SUPER_ADMIN' && branchId ? branchId : user.branchId;
    return this.maintenanceService.resolveExpense(id, activeBranchId, user);
  }
}
