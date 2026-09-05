import { Controller, Get, Post, Body, Param, UseGuards, Req, Headers, BadRequestException, Inject } from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { Action } from '../../casl/action.enum';
import { PaymentMethod } from '@prisma/client';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Redis } from 'ioredis';

@Controller('fees')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class FeesController {
  constructor(
    private readonly feesService: FeesService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Get('structures')
  @CheckPolicies((ability) => ability.can(Action.Read, 'FeeStructure'))
  getFeeStructures(@Req() req: any) {
    return this.feesService.getFeeStructures(req.user.branchId);
  }

  @Post('structures')
  @CheckPolicies((ability) => ability.can(Action.Create, 'FeeStructure'))
  createFeeStructure(@Body() body: { name: string; totalAmount: number }, @Req() req: any) {
    return this.feesService.createFeeStructure(req.user.branchId, body);
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'FeeInstallment'))
  getLedger(@Req() req: any) {
    return this.feesService.getFeeLedger(req.user.branchId);
  }

  @Get('student/:studentId')
  @CheckPolicies((ability) => ability.can(Action.Read, 'FeeInstallment'))
  getStudentLedger(@Param('studentId') studentId: string, @Req() req: any) {
    return this.feesService.getStudentLedger(studentId, req.user.branchId);
  }

  @Post('student/:studentId/installments/:installmentId/pay')
  @CheckPolicies((ability) => ability.can(Action.Update, 'FeeInstallment'))
  async processPayment(
    @Param('studentId') studentId: string,
    @Param('installmentId') installmentId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() body: { amount: number; paymentMethod: PaymentMethod; referenceNumber?: string },
    @Req() req: any
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required for payment processing');
    }

    const cacheKey = `idempotency:payment:${idempotencyKey}`;
    
    // Check if this request was already processed
    const cachedResponse = await this.redis.get(cacheKey);
    if (cachedResponse) {
      if (cachedResponse === 'PROCESSING') {
        throw new BadRequestException('A payment with this Idempotency-Key is currently being processed');
      }
      return JSON.parse(cachedResponse);
    }

    // Lock the key temporarily to prevent race conditions during long processing
    const acquired = await this.redis.setnx(cacheKey, 'PROCESSING');
    if (!acquired) {
      throw new BadRequestException('A payment with this Idempotency-Key is currently being processed');
    }
    
    // Ensure we clean up the lock if processing fails
    await this.redis.expire(cacheKey, 60);

    try {
      const { transaction, receipt } = await this.feesService.processPayment(
        studentId,
        installmentId,
        body.amount, // Expecting cents from frontend
        body.paymentMethod,
        body.referenceNumber || null,
        req.user,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      // Fire and forget PDF generation or await it (awaiting here so URL is returned to frontend immediately)
      const documentUrl = await this.feesService.generateAndUploadReceiptPdf(receipt.id, studentId);

      const response = {
        success: true,
        transaction,
        receipt: {
          ...receipt,
          documentUrl
        }
      };

      // Store the successful response for 24 hours
      await this.redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(response));

      return response;
    } catch (error) {
      // Clear the processing lock on failure so client can safely retry if needed
      await this.redis.del(cacheKey);
      throw error;
    }
  }
}
