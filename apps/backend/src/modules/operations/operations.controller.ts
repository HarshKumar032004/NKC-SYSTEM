import { Controller, Get, Post, Put, Delete, Body, Param, Req, Res, UseGuards, Query } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { InventoryService } from './inventory.service';
import { IdCardService } from './id-card.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { InventoryCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly idCardService: IdCardService,
    private readonly prisma: PrismaService
  ) {}

  // --- Generic Lookups --- //

  @Get('branches')
  async getBranches() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true }
    });
  }

  @Get('courses')
  async getCourses() {
    return this.prisma.course.findMany({
      orderBy: { name: 'asc' }
    });
  }

  @Post('courses/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async updateCourse(
    @Param('id') id: string,
    @Body() data: { baseFee: number }
  ) {
    return this.prisma.course.update({
      where: { id },
      data: { baseFee: data.baseFee }
    });
  }
  
  // --- Batches Endpoints --- //
  
  @Get('batches')
  async getBatches(@Query('branchId') branchId?: string) {
    if (branchId) {
      const standardBatches = ["7th", "8th", "9th", "10th", "11th", "12th", "NEET", "JEE"];
      const existing = await this.prisma.batch.findMany({ where: { branchId, name: { in: standardBatches } } });
      const existingNames = existing.map(b => b.name);
      const missing = standardBatches.filter(b => !existingNames.includes(b));
      
      if (missing.length > 0) {
        let course = await this.prisma.course.findFirst({ where: { branchId } });
        if (!course) {
          course = await this.prisma.course.create({ 
            data: { name: 'General', code: 'GEN-' + branchId.substring(0,4), branchId, semester: 1 } 
          });
        }
        await this.prisma.batch.createMany({
          data: missing.map(name => ({
            name,
            branchId,
            courseId: course.id,
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          }))
        });
      }
    }

    const allBatches = await this.prisma.batch.findMany({
      where: branchId ? { branchId } : undefined,
      select: { id: true, name: true, capacity: true, branchId: true, courseId: true, startDate: true, endDate: true }
    });

    // Sort according to standard order
    const order = ["7th", "8th", "9th", "10th", "11th", "12th", "NEET", "JEE"];
    return allBatches.sort((a, b) => {
      const aIdx = order.indexOf(a.name);
      const bIdx = order.indexOf(b.name);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  @Post('batches')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async createBatch(@Req() req: any, @Body() data: { name: string; capacity: number; courseId: string; startDate: string; endDate: string }) {
    return this.prisma.batch.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        courseId: data.courseId,
        branchId: req.user.branchId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate)
      }
    });
  }

  @Put('batches/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async updateBatch(@Param('id') id: string, @Body() data: { name?: string; capacity?: number; courseId?: string; startDate?: string; endDate?: string }) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    return this.prisma.batch.update({
      where: { id },
      data: updateData
    });
  }

  @Delete('batches/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async deleteBatch(@Param('id') id: string) {
    return this.prisma.batch.delete({ where: { id } });
  }

  // --- Rooms Endpoints --- //

  @Get('rooms')
  async getRooms(@Req() req: any) {
    return this.prisma.room.findMany({
      where: { branchId: req.user.branchId, isArchived: false },
      orderBy: { name: 'asc' }
    });
  }

  @Post('rooms')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async createRoom(@Req() req: any, @Body() data: { name: string; capacity: number }) {
    return this.prisma.room.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        branchId: req.user.branchId
      }
    });
  }

  @Put('rooms/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async updateRoom(@Param('id') id: string, @Body() data: { name?: string; capacity?: number }) {
    return this.prisma.room.update({
      where: { id },
      data
    });
  }

  @Delete('rooms/:id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async deleteRoom(@Param('id') id: string) {
    return this.prisma.room.update({
      where: { id },
      data: { isArchived: true }
    });
  }

  // --- Inventory Endpoints ---

  @Get('inventory')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Branch'))
  async getInventory(@Req() req: any) {
    return this.inventoryService.getInventory(req.user.branchId);
  }

  @Post('inventory')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async addInventoryItem(
    @Req() req: any,
    @Body() data: { name: string; category: InventoryCategory; sku: string; price: number; minStockThreshold: number; initialStock: number }
  ) {
    return this.inventoryService.addInventoryItem(req.user.branchId, data);
  }

  @Post('inventory/stock')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async addStock(
    @Req() req: any,
    @Body() data: { itemId: string; quantity: number; remarks?: string }
  ) {
    return this.inventoryService.addStock(req.user.branchId, data.itemId, data.quantity, data.remarks);
  }

  @Post('inventory/issue')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Branch'))
  async issueMaterial(
    @Req() req: any,
    @Body() data: { studentId: string; itemId: string; quantity: number; remarks?: string }
  ) {
    return this.inventoryService.issueMaterial(req.user.branchId, req.user.userId, data);
  }

  // --- ID Card Endpoints ---

  @Get('id-cards/student/:studentId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async generateSingleIdCard(
    @Req() req: any,
    @Res() res: FastifyReply,
    @Param('studentId') studentId: string
  ) {
    const pdfBuffer = await this.idCardService.generateIdCard(req.user.branchId, studentId);
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="id_card_${studentId}.pdf"`);
    res.header('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  }

  @Get('id-cards/batch/:batchId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'User'))
  async generateBulkIdCards(
    @Req() req: any,
    @Res() res: FastifyReply,
    @Param('batchId') batchId: string
  ) {
    const pdfBuffer = await this.idCardService.bulkGenerateIdCards(req.user.branchId, batchId);
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="batch_${batchId}_id_cards.pdf"`);
    res.header('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  }
}
