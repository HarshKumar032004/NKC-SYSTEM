import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('export/:studentId')
  async exportPii(@Param('studentId') studentId: string, @Req() req: any) {
    // Only branch admins or the specific user should be able to export
    // Assuming policy guard checks are implemented
    return this.privacyService.exportStudentPii(studentId, req.user.branchId);
  }
}
