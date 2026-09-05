import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService, CreateUserDto } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async findAll(@Req() req: any) {
    return this.usersService.findAll(req.user.branchId);
  }

  @Get('roles')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Role'))
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async create(@Req() req: any, @Body() dto: CreateUserDto) {
    // Force the branchId to be the one the admin is currently managing
    dto.branchId = req.user.branchId;
    return this.usersService.create(dto);
  }

  @Patch(':id/status')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'User'))
  async toggleStatus(@Req() req: any, @Param('id') id: string) {
    return this.usersService.toggleStatus(id, req.user.branchId);
  }
}
