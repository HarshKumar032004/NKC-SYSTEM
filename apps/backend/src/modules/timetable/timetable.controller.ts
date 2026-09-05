import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { DayOfWeek } from '@prisma/client';

@Controller('timetable')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'TimetableSession'))
  getSessions(@Req() req: any) {
    return this.timetableService.getSessions(req.user.branchId);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'TimetableSession'))
  createSession(@Body() body: { batchId: string; teacherId: string; roomId: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }, @Req() req: any) {
    return this.timetableService.createSession(
      req.user.branchId,
      body.batchId,
      body.teacherId,
      body.roomId,
      body.dayOfWeek,
      body.startTime,
      body.endTime
    );
  }

  @Put(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'TimetableSession'))
  updateSession(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.timetableService.updateSession(id, req.user.branchId, body);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'TimetableSession'))
  deleteSession(@Param('id') id: string, @Req() req: any) {
    return this.timetableService.deleteSession(id, req.user.branchId);
  }
}
