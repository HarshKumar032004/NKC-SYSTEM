import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { CreateStudentDto, StudentFilterQueryDto, CreateStudentSchema, StudentFilterQuerySchema, UpdateStudentDto, UpdateStudentSchema } from '@nkc/shared-types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsePipes } from '@nestjs/common';

@Controller('students')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'Student'))
  @UsePipes(new ZodValidationPipe(CreateStudentSchema))
  create(@Body() createStudentDto: CreateStudentDto, @Req() req: any) {
    const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    return this.studentsService.createStudent(createStudentDto, req.user, auditContext);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Student'))
  @UsePipes(new ZodValidationPipe(StudentFilterQuerySchema))
  findAll(@Query() query: StudentFilterQueryDto, @Req() req: any) {
    return this.studentsService.findAll(query, req.user);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Student'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.studentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Student'))
  @UsePipes(new ZodValidationPipe(UpdateStudentSchema))
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto, @Req() req: any) {
    const auditContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    return this.studentsService.update(id, updateStudentDto, req.user, auditContext);
  }

  @Post(':id/upload-url')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Student'))
  generateUploadUrl(
    @Param('id') id: string,
    @Body() fileMeta: { fileName: string; mimeType: string; sizeBytes: number },
    @Req() req: any
  ) {
    if (!fileMeta.fileName || !fileMeta.mimeType || !fileMeta.sizeBytes) {
      throw new BadRequestException('Missing file metadata');
    }
    return this.studentsService.generatePresignedUploadUrl(id, fileMeta.fileName, fileMeta.mimeType, fileMeta.sizeBytes, req.user);
  }

  @Get(':id/documents/:documentId/download-url')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Student'))
  generateDownloadUrl(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Req() req: any
  ) {
    return this.studentsService.generatePresignedDownloadUrl(id, documentId, req.user);
  }

  // --- Enrollments (for attendance & allocation) --- //

  @Get('enrollments/batch/:batchId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Student'))
  async getEnrollmentsByBatch(
    @Param('batchId') batchId: string,
    @Query('status') status: string,
    @Req() req: any
  ) {
    return this.studentsService.getEnrollmentsByBatch(req.user.branchId, batchId, status);
  }
}
