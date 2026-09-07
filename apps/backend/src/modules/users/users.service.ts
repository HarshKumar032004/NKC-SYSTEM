import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';

export class CreateUserDto {
  email!: string;
  password!: string;
  roleId!: string;
  branchId!: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.user.findMany({
      where: { branchId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Email already in use.');
    }

    const passwordHash = await argon2.hash(dto.password);
    
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
        branchId: dto.branchId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: true,
      }
    });
  }

  async toggleStatus(id: string, branchId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.branchId !== branchId) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true }
    });
  }
}
