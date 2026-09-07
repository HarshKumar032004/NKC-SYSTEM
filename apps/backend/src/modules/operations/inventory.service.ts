import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryCategory, StockTransactionType } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all inventory items for a branch
   */
  async getInventory(branchId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  /**
   * Add a new inventory item
   */
  async addInventoryItem(branchId: string, data: { name: string; category: InventoryCategory; sku: string; price: number; minStockThreshold: number; initialStock: number }) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          branchId,
          name: data.name,
          category: data.category,
          sku: data.sku,
          price: data.price,
          minStockThreshold: data.minStockThreshold,
          stockQuantity: data.initialStock,
        },
      });

      if (data.initialStock > 0) {
        await tx.stockTransaction.create({
          data: {
            itemId: item.id,
            branchId,
            type: StockTransactionType.IN,
            quantity: data.initialStock,
            remarks: 'Initial stock',
          },
        });
      }

      return item;
    });
  }

  /**
   * Issue material to a student.
   * Handles creating the MaterialIssue record and decrementing stock within a transaction.
   */
  async issueMaterial(branchId: string, issuerId: string, data: { studentId: string; itemId: string; quantity: number; remarks?: string }) {
    if (data.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check current stock
      const item = await tx.inventoryItem.findUnique({
        where: { id: data.itemId },
      });

      if (!item || item.branchId !== branchId) {
        throw new NotFoundException('Inventory item not found in this branch.');
      }

      if (item.stockQuantity < data.quantity) {
        throw new BadRequestException(`Insufficient stock. Only ${item.stockQuantity} remaining.`);
      }

      // 2. Decrement stock
      const updatedItem = await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: { stockQuantity: { decrement: data.quantity } },
      });

      // 3. Log stock transaction (OUT)
      await tx.stockTransaction.create({
        data: {
          itemId: data.itemId,
          branchId,
          type: StockTransactionType.OUT,
          quantity: data.quantity,
          remarks: data.remarks || 'Material issued to student',
        },
      });

      // 4. Record Material Issue
      const issue = await tx.materialIssue.create({
        data: {
          studentId: data.studentId,
          itemId: data.itemId,
          quantity: data.quantity,
          issuedById: issuerId,
          branchId,
        },
      });

      // Fire and forget low stock check
      this.checkLowStock(updatedItem).catch(err => this.logger.error('Failed to check low stock', err));

      return issue;
    });
  }

  /**
   * Add stock to an existing item
   */
  async addStock(branchId: string, itemId: string, quantity: number, remarks?: string) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero.');

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id: itemId, branchId },
        data: { stockQuantity: { increment: quantity } },
      });

      await tx.stockTransaction.create({
        data: {
          itemId,
          branchId,
          type: StockTransactionType.IN,
          quantity,
          remarks: remarks || 'Stock added manually',
        },
      });

      return item;
    });
  }

  /**
   * Checks if item is below threshold and logs a warning.
   * In a real production system, this would push a job to BullMQ for email/app notifications.
   */
  private async checkLowStock(item: { id: string; name: string; sku: string; stockQuantity: number; minStockThreshold: number; branchId: string }) {
    if (item.stockQuantity <= item.minStockThreshold) {
      this.logger.warn(`LOW STOCK ALERT: Item [${item.sku}] ${item.name} is at ${item.stockQuantity} (Threshold: ${item.minStockThreshold}). Branch: ${item.branchId}`);
      // Integrate with NotificationsModule here to alert Branch Admin
    }
  }
}
