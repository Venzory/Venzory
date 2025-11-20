/**
 * Audit Service
 * Centralized audit logging for all state-changing operations
 */

import { AuditRepository, type CreateAuditLogInput } from '@/src/repositories/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import type { TransactionClient } from '@/src/repositories/base';

export interface AuditEvent {
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export class AuditService {
  constructor(private auditRepository: AuditRepository) {}

  /**
   * Log an audit event
   */
  async log(
    ctx: RequestContext,
    event: AuditEvent,
    tx?: TransactionClient
  ): Promise<void> {
    await this.auditRepository.createAuditLog(
      {
        practiceId: ctx.practiceId,
        actorId: ctx.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        changes: event.changes ?? null,
        metadata: event.metadata ?? null,
      },
      { tx }
    );
  }

  /**
   * Log item creation
   */
  async logItemCreated(
    ctx: RequestContext,
    itemId: string,
    itemData: {
      name: string;
      sku?: string | null;
      productId: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Item',
        entityId: itemId,
        action: 'CREATED',
        changes: {
          name: itemData.name,
          sku: itemData.sku,
          productId: itemData.productId,
        },
      },
      tx
    );
  }

  /**
   * Log item update
   */
  async logItemUpdated(
    ctx: RequestContext,
    itemId: string,
    changes: Record<string, any>,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Item',
        entityId: itemId,
        action: 'UPDATED',
        changes,
      },
      tx
    );
  }

  /**
   * Log item deletion
   */
  async logItemDeleted(
    ctx: RequestContext,
    itemId: string,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Item',
        entityId: itemId,
        action: 'DELETED',
      },
      tx
    );
  }

  /**
   * Log stock adjustment
   */
  async logStockAdjustment(
    ctx: RequestContext,
    adjustmentId: string,
    data: {
      itemId: string;
      itemName: string;
      locationId: string;
      locationName: string;
      quantity: number;
      reason?: string | null;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockAdjustment',
        entityId: adjustmentId,
        action: 'CREATED',
        changes: {
          itemId: data.itemId,
          itemName: data.itemName,
          locationId: data.locationId,
          locationName: data.locationName,
          quantity: data.quantity,
          reason: data.reason,
        },
      },
      tx
    );
  }

  /**
   * Log order creation
   */
  async logOrderCreated(
    ctx: RequestContext,
    orderId: string,
    orderData: {
      supplierId: string;
      supplierName: string;
      itemCount: number;
      totalAmount?: number;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Order',
        entityId: orderId,
        action: 'CREATED',
        changes: {
          supplierId: orderData.supplierId,
          supplierName: orderData.supplierName,
          itemCount: orderData.itemCount,
          totalAmount: orderData.totalAmount,
        },
      },
      tx
    );
  }

  /**
   * Log order sent
   */
  async logOrderSent(
    ctx: RequestContext,
    orderId: string,
    orderData: {
      supplierName: string;
      itemCount: number;
      totalAmount?: number;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Order',
        entityId: orderId,
        action: 'SENT',
        changes: {
          supplierName: orderData.supplierName,
          itemCount: orderData.itemCount,
          totalAmount: orderData.totalAmount,
        },
      },
      tx
    );
  }

  /**
   * Log order deletion
   */
  async logOrderDeleted(
    ctx: RequestContext,
    orderId: string,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Order',
        entityId: orderId,
        action: 'DELETED',
      },
      tx
    );
  }

  /**
   * Log goods receipt confirmation
   */
  async logGoodsReceiptConfirmed(
    ctx: RequestContext,
    receiptId: string,
    receiptData: {
      lineCount: number;
      totalQuantity: number;
      items: Array<{
        itemId: string;
        itemName: string;
        quantity: number;
        batchNumber?: string | null;
        expiryDate?: Date | null;
      }>;
    },
    metadata?: {
      locationId: string;
      orderId?: string | null;
      practiceSupplierId?: string | null;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'GoodsReceipt',
        entityId: receiptId,
        action: 'CONFIRMED',
        changes: {
          lineCount: receiptData.lineCount,
          totalQuantity: receiptData.totalQuantity,
          items: receiptData.items,
        },
        metadata,
      },
      tx
    );
  }

  /**
   * Log goods receipt cancellation
   */
  async logGoodsReceiptCancelled(
    ctx: RequestContext,
    receiptId: string,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'GoodsReceipt',
        entityId: receiptId,
        action: 'CANCELLED',
      },
      tx
    );
  }

  /**
   * Log product creation
   */
  async logProductCreated(
    ctx: RequestContext,
    productId: string,
    productData: {
      name: string;
      gtin?: string | null;
      brand?: string | null;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Product',
        entityId: productId,
        action: 'CREATED',
        changes: {
          name: productData.name,
          gtin: productData.gtin,
          brand: productData.brand,
        },
      },
      tx
    );
  }

  /**
   * Log product update
   */
  async logProductUpdated(
    ctx: RequestContext,
    productId: string,
    changes: Record<string, any>,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Product',
        entityId: productId,
        action: 'UPDATED',
        changes,
      },
      tx
    );
  }

  /**
   * Log product deletion
   */
  async logProductDeleted(
    ctx: RequestContext,
    productId: string,
    productData: {
      name: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Product',
        entityId: productId,
        action: 'DELETED',
        changes: {
          name: productData.name,
        },
      },
      tx
    );
  }

  /**
   * Log GS1 lookup triggered
   */
  async logGs1LookupTriggered(
    ctx: RequestContext,
    productId: string,
    data: {
      gtin: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Product',
        entityId: productId,
        action: 'GS1_LOOKUP_TRIGGERED',
        changes: {
          gtin: data.gtin,
        },
      },
      tx
    );
  }

  /**
   * Log supplier catalog updated
   */
  async logSupplierCatalogUpdated(
    ctx: RequestContext,
    practiceSupplierId: string,
    productId: string,
    data: {
      supplierSku?: string | null;
      unitPrice?: number | null;
      isActive: boolean;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'SupplierCatalog',
        entityId: `${practiceSupplierId}_${productId}`,
        action: 'UPSERTED',
        changes: {
          supplierSku: data.supplierSku,
          unitPrice: data.unitPrice,
          isActive: data.isActive,
        },
        metadata: {
          practiceSupplierId,
          productId,
        },
      },
      tx
    );
  }

  /**
   * Log stock count session created
   */
  async logStockCountSessionCreated(
    ctx: RequestContext,
    sessionId: string,
    data: {
      locationId: string;
      locationName: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountSession',
        entityId: sessionId,
        action: 'CREATED',
        changes: {
          locationId: data.locationId,
          locationName: data.locationName,
        },
      },
      tx
    );
  }

  /**
   * Log stock count line added
   */
  async logStockCountLineAdded(
    ctx: RequestContext,
    lineId: string,
    data: {
      itemId: string;
      itemName: string;
      countedQuantity: number;
      systemQuantity: number;
      variance: number;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountLine',
        entityId: lineId,
        action: 'ADDED',
        changes: {
          itemId: data.itemId,
          itemName: data.itemName,
          countedQuantity: data.countedQuantity,
          systemQuantity: data.systemQuantity,
          variance: data.variance,
        },
      },
      tx
    );
  }

  /**
   * Log stock count line updated
   */
  async logStockCountLineUpdated(
    ctx: RequestContext,
    lineId: string,
    data: {
      itemId: string;
      itemName: string;
      countedQuantity: number;
      systemQuantity: number;
      variance: number;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountLine',
        entityId: lineId,
        action: 'UPDATED',
        changes: {
          itemId: data.itemId,
          itemName: data.itemName,
          countedQuantity: data.countedQuantity,
          systemQuantity: data.systemQuantity,
          variance: data.variance,
        },
      },
      tx
    );
  }

  /**
   * Log stock count line removed
   */
  async logStockCountLineRemoved(
    ctx: RequestContext,
    lineId: string,
    data: {
      itemId: string;
      itemName: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountLine',
        entityId: lineId,
        action: 'REMOVED',
        changes: {
          itemId: data.itemId,
          itemName: data.itemName,
        },
      },
      tx
    );
  }

  /**
   * Log stock count completed
   */
  async logStockCountCompleted(
    ctx: RequestContext,
    sessionId: string,
    data: {
      locationId: string;
      locationName: string;
      lineCount: number;
      adjustmentsApplied: boolean;
      adjustedItemCount: number;
      totalVariance: number;
      adminOverride?: boolean;
      concurrencyWarnings?: string[];
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountSession',
        entityId: sessionId,
        action: 'COMPLETED',
        changes: {
          locationId: data.locationId,
          locationName: data.locationName,
          lineCount: data.lineCount,
          adjustmentsApplied: data.adjustmentsApplied,
          adjustedItemCount: data.adjustedItemCount,
          totalVariance: data.totalVariance,
        },
      },
      tx
    );
  }

  /**
   * Log stock count cancelled
   */
  async logStockCountCancelled(
    ctx: RequestContext,
    sessionId: string,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountSession',
        entityId: sessionId,
        action: 'CANCELLED',
      },
      tx
    );
  }

  /**
   * Log stock count deleted
   */
  async logStockCountDeleted(
    ctx: RequestContext,
    sessionId: string,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'StockCountSession',
        entityId: sessionId,
        action: 'DELETED',
      },
      tx
    );
  }

  /**
   * Log practice settings updated
   */
  async logPracticeSettingsUpdated(
    ctx: RequestContext,
    practiceId: string,
    changes: Record<string, any>,
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'Practice',
        entityId: practiceId,
        action: 'SETTINGS_UPDATED',
        changes,
      },
      tx
    );
  }

  /**
   * Log user role updated
   */
  async logUserRoleUpdated(
    ctx: RequestContext,
    userId: string,
    data: {
      oldRole: string;
      newRole: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'PracticeUser',
        entityId: userId,
        action: 'ROLE_UPDATED',
        changes: {
          oldRole: data.oldRole,
          newRole: data.newRole,
        },
      },
      tx
    );
  }

  /**
   * Log user removed from practice
   */
  async logUserRemovedFromPractice(
    ctx: RequestContext,
    userId: string,
    data: {
      name: string;
      email: string;
      role: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'PracticeUser',
        entityId: userId,
        action: 'REMOVED',
        changes: {
          name: data.name,
          email: data.email,
          role: data.role,
        },
      },
      tx
    );
  }

  /**
   * Log invite cancelled
   */
  async logInviteCancelled(
    ctx: RequestContext,
    inviteId: string,
    data: {
      email: string;
      role: string;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.log(
      ctx,
      {
        entityType: 'UserInvite',
        entityId: inviteId,
        action: 'CANCELLED',
        changes: {
          email: data.email,
          role: data.role,
        },
      },
      tx
    );
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(
    ctx: RequestContext,
    entityType: string,
    entityId: string
  ) {
    return this.auditRepository.findAuditLogsForEntity(
      entityType,
      entityId,
      ctx.practiceId
    );
  }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService(new AuditRepository());
  }
  return auditServiceInstance;
}

