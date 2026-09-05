import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { InventoryService } from './inventory.service';
import { IdCardService } from './id-card.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CaslModule } from '../../casl/casl.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, CaslModule, NotificationsModule],
  controllers: [OperationsController],
  providers: [InventoryService, IdCardService],
  exports: [InventoryService, IdCardService],
})
export class OperationsModule {}
