import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from '@nkc/shared-types';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { code: createBranchDto.code },
    });

    if (existing) {
      throw new BadRequestException('Branch with this code already exists');
    }

    return this.prisma.branch.create({
      data: {
        name: createBranchDto.name,
        code: createBranchDto.code,
        address: createBranchDto.address,
        contactPhone: createBranchDto.contactPhone,
        email: createBranchDto.email,
        city: createBranchDto.city,
        state: createBranchDto.state,
        zipCode: createBranchDto.zipCode,
        managerName: createBranchDto.managerName,
        hostelFee: createBranchDto.hostelFee,
        messFee: createBranchDto.messFee,
        isActive: createBranchDto.isActive,
      },
    });
  }

  async findAll(userRole: string, userBranchId: string) {
    return this.prisma.branch.findMany({
      where: {
        id: userRole === 'SUPER_ADMIN' ? undefined : userBranchId,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userRole: string, userBranchId: string) {
    if (userRole !== 'SUPER_ADMIN' && id !== userBranchId) {
      throw new NotFoundException('Branch not found or access denied');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    // Check existence
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Code uniqueness if code is updated
    if (updateBranchDto.code && updateBranchDto.code !== branch.code) {
      const existing = await this.prisma.branch.findUnique({
        where: { code: updateBranchDto.code },
      });
      if (existing) {
        throw new BadRequestException('Branch with this code already exists');
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  async remove(id: string) {
    // Implement soft delete by setting isActive to false
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
