import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { PayrollStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('teachers')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getTeachers(@Req() req: any) {
    return this.hrService.getTeachers(req.user.branchId);
  }

  @Post('teachers')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async createTeacher(@Req() req: any, @Body() data: any) {
    return this.hrService.createTeacher(req.user.branchId, data);
  }

  @Get('teachers/:id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getTeacherById(@Req() req: any, @Param('id') id: string) {
    return this.hrService.getTeacherById(req.user.branchId, id);
  }

  @Get('teachers/:id/workload')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async getTeacherWorkload(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('month') month: string,
    @Query('year') year: string
  ) {
    const totalMinutes = await this.hrService.getTeacherWorkload(
      id,
      req.user.branchId,
      parseInt(month),
      parseInt(year)
    );
    return { teacherId: id, totalMinutes, totalHours: (totalMinutes / 60).toFixed(2) };
  }

  @Post('payroll/generate')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async generatePayroll(
    @Req() req: any,
    @Body() data: { month: number; year: number }
  ) {
    return this.hrService.generatePayroll(req.user.branchId, data.month, data.year);
  }

  @Put('payroll/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async updatePayrollRecord(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { bonus?: number; deductions?: number; status?: PayrollStatus }
  ) {
    return this.hrService.updatePayrollRecord(req.user.branchId, id, data);
  }
}
