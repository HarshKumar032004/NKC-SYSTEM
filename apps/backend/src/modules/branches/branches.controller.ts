import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UsePipes } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { CreateBranchDto, UpdateBranchDto, CreateBranchSchema, UpdateBranchSchema } from '@nkc/shared-types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('branches')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch')) // Only SUPER_ADMIN usually
  @UsePipes(new ZodValidationPipe(CreateBranchSchema))
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  // Any authenticated user can read branches (filtered down by service based on role)
  findAll(@Req() req: any) {
    return this.branchesService.findAll(req.user.role, req.user.branchId);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Branch'))
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.branchesService.findOne(id, req.user.role, req.user.branchId);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Branch'))
  @UsePipes(new ZodValidationPipe(UpdateBranchSchema))
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Branch'))
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
