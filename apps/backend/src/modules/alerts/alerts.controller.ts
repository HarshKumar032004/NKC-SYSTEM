import { Controller, Post, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../common/guards/policies.guard';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  // Only SUPER_ADMIN can hit this endpoint (or users explicitly given manage all permission)
  @CheckPolicies((ability) => ability.can(Action.Manage, 'all'))
  @Post('test')
  async testAlert(@CurrentUser() user: any) {
    await this.alertsService.sendSecurityAlert(
      'Test Alert from Admin',
      'This is a manual test of the email alert delivery system.',
      {
        triggeredBy: user.email,
        timestamp: new Date().toISOString(),
      }
    );
    return { success: true, message: 'Test alert queued.' };
  }
}
