import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { AppAbility } from '../../casl/casl-ability.factory';
import { Action } from '../../casl/action.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Branch')) // Only Admins usually have widespread Read on Branch or specific Report domain
  async getDashboardKpis(@Req() req: any) {
    const branchId = req.user.branchId;
    return this.reportsService.getDashboardKpis(branchId);
  }

  @Post('export')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Branch'))
  async triggerExport(@Req() req: any, @Body() exportDto: any) {
    const branchId = req.user.branchId;
    const userId = req.user.sub;
    
    // trigger background export job
    await this.reportsService.triggerDataExport({
      ...exportDto,
      branchId,
      userId
    });

    return { message: 'Export job triggered. You will receive a notification when the download is ready.' };
  }
}
