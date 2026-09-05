import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceService, BulkAttendanceDto } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('bulk')
  @CheckPolicies((ability) => ability.can(Action.Create, 'AttendanceRecord'))
  markBulkAttendance(@Body() payload: BulkAttendanceDto, @Req() req: any) {
    return this.attendanceService.markBulkAttendance(req.user.branchId, payload, req.user);
  }

  @Get('rollup')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AttendanceRecord'))
  getBatchRollup(
    @Query('batchId') batchId: string,
    @Query('date') date: string,
    @Req() req: any
  ) {
    return this.attendanceService.getBatchRollup(req.user.branchId, batchId, date);
  }

  @Get('records')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AttendanceRecord'))
  async getAttendanceRecords(
    @Query('batchId') batchId: string,
    @Query('date') date: string,
    @Req() req: any
  ) {
    return this.attendanceService.getAttendanceRecords(req.user.branchId, batchId, date);
  }

  @Get('schedule')
  async getTeacherSchedule(
    @Query('date') date: string,
    @Req() req: any
  ) {
    return this.attendanceService.getTeacherSchedule(req.user.id, date);
  }
}
