import { Controller, Get } from '@nestjs/common';
import type { HealthCheckResponse } from '@nkc/shared-types';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nkc-backend',
      version: '0.0.1',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
