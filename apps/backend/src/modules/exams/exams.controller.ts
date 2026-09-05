import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ExamsService, BulkMarksDto } from './exams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';

@Controller('exams')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'Exam'))
  createExam(@Body() payload: any, @Req() req: any) {
    return this.examsService.createExam(req.user.branchId, payload);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Exam'))
  listExams(@Req() req: any) {
    return this.examsService.listExams(req.user.branchId);
  }

  @Get(':examId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Exam'))
  getExam(@Param('examId') examId: string, @Req() req: any) {
    return this.examsService.getExam(req.user.branchId, examId);
  }

  @Post(':examId/marks')
  @CheckPolicies((ability) => ability.can(Action.Update, 'ExamResult'))
  saveMarks(@Param('examId') examId: string, @Body() payload: BulkMarksDto, @Req() req: any) {
    return this.examsService.saveMarks(req.user.branchId, examId, payload);
  }

  @Get(':examId/rankings')
  @CheckPolicies((ability) => ability.can(Action.Read, 'ExamResult'))
  calculateRankings(@Param('examId') examId: string, @Req() req: any) {
    return this.examsService.calculateRankings(req.user.branchId, examId);
  }

  @Get(':examId/report-card/:studentId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'ExamResult'))
  generateReportCard(
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
    @Req() req: any
  ) {
    return this.examsService.generateReportCardPdf(req.user.branchId, examId, studentId);
  }
}
