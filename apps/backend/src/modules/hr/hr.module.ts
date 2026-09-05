import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CaslModule } from '../../casl/casl.module';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
