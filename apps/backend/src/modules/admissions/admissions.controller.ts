import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { LeadStatus } from '@prisma/client';
import { CreateLeadDto, UpdateLeadStatusDto, LogFollowUpDto } from './dto/admissions.dto';

@Controller('admissions/leads')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'Lead'))
  createLead(@Body() body: CreateLeadDto, @Req() req: any) {
    return this.admissionsService.createLead(req.user.branchId, body);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Lead'))
  getLeads(
    @Query('search') search: string,
    @Query('status') status: LeadStatus,
    @Req() req: any
  ) {
    return this.admissionsService.getLeads(req.user.branchId, { search, status });
  }

  @Patch(':id/status')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Lead'))
  updateStatus(@Param('id') id: string, @Body() body: UpdateLeadStatusDto, @Req() req: any) {
    return this.admissionsService.updateLeadStatus(id, body.status, req.user);
  }

  @Post(':id/follow-up')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Lead'))
  logFollowUp(@Param('id') id: string, @Body() body: LogFollowUpDto, @Req() req: any) {
    return this.admissionsService.logFollowUp(id, body, req.user);
  }

  @Post(':id/convert')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Lead'))
  convertLead(@Param('id') id: string, @Req() req: any) {
    const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    return this.admissionsService.convertLeadToStudent(id, req.user, auditContext);
  }
}
