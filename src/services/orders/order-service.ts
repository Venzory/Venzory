/**
 * Order Service
 * Business logic for order management
 */

import { OrderRepository } from '@/src/repositories/orders';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import {
  CreateOrderInput,
  UpdateOrderInput,
  AddOrderItemInput,
  UpdateOrderItemInput,
  OrderFilters,
  OrderWithRelations,
  OrderSummary,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';
import {
  validatePositiveQuantity,
  validateStringLength,
  validateOrderCanBeSent,
  validatePrice,
} from '@/src/domain/validators';
import { prisma } from '@/lib/prisma';
import type { OrderTemplate, OrderTemplateItem } from '@prisma/client';

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private inventoryRepository: InventoryRepository,
    private userRepository: UserRepository,
    private practiceSupplierRepository: PracticeSupplierRepository,
    private auditService: AuditService
  ) {}

  /**
   * Find orders with filters
   */
  async findOrders(
    ctx: RequestContext,
    filters?: Partial<OrderFilters>,
    pagination?: { page?: number; limit?: number }
  ): Promise<OrderWithRelations[]> {
    return this.orderRepository.findOrders(ctx.practiceId, filters, {
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 50,
      },
    });
  }

  /**
   * Get order summaries (for list views)
   */
  async getOrderSummaries(
    ctx: RequestContext,
    filters?: Partial<OrderFilters>,
    pagination?: { page?: number; limit?: number }
  ): Promise<OrderSummary[]> {
    return this.orderRepository.getOrderSummaries(ctx.practiceId, filters, {
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 50,
      },
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(
    ctx: RequestContext,
    orderId: string
  ): Promise<OrderWithRelations> {
    return this.orderRepository.findOrderById(orderId, ctx.practiceId);
  }

  /**
   * Create new order
   * Supports both legacy Supplier and new PracticeSupplier (Phase 2)
   */
  async createOrder(
    ctx: RequestContext,
    input: Omit<CreateOrderInput, 'practiceId'>
  ): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (input.items.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }

    // Validate supplier IDs - at least one must be provided
    if (!input.supplierId && !input.practiceSupplierId) {
      throw new ValidationError('Either supplierId or practiceSupplierId must be provided');
    }

    // Validate all items
    for (const item of input.items) {
      validatePositiveQuantity(item.quantity);
    }

    // Phase 2: Resolve supplier IDs using dual-supplier pattern
    const resolvedSupplierIds = await this.resolveSupplierIds(
      input,
      ctx.practiceId
    );

    return withTransaction(async (tx) => {
      // Verify all items exist
      for (const item of input.items) {
        await this.inventoryRepository.findItemById(item.itemId, ctx.practiceId, { tx });
      }

      // Create order with resolved supplier IDs
      const order = await this.orderRepository.createOrder(
        ctx.userId,
        {
          ...input,
          practiceId: ctx.practiceId,
          supplierId: resolvedSupplierIds.supplierId,
          practiceSupplierId: resolvedSupplierIds.practiceSupplierId,
        },
        { tx }
      );

      // Get full order with relations
      const fullOrder = await this.orderRepository.findOrderById(
        order.id,
        ctx.practiceId,
        { tx }
      );

      // Calculate total amount
      const totalAmount = fullOrder.items?.reduce((sum, item) => {
        const price = item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0;
        return sum + price * item.quantity;
      }, 0) ?? 0;

      // Get supplier name from appropriate source
      const supplierName = this.getSupplierDisplayName(fullOrder);

      // Log audit event
      await this.auditService.logOrderCreated(
        ctx,
        order.id,
        {
          supplierId: resolvedSupplierIds.supplierId,
          supplierName,
          itemCount: input.items.length,
          totalAmount,
        },
        tx
      );

      return fullOrder;
    });
  }

  /**
   * Resolve supplier IDs for dual-supplier pattern (Phase 2)
   * Ensures both supplierId and practiceSupplierId are populated when applicable
   */
  private async resolveSupplierIds(
    input: Pick<CreateOrderInput, 'supplierId' | 'practiceSupplierId'>,
    practiceId: string
  ): Promise<{ supplierId: string; practiceSupplierId: string | null }> {
    // Case 1: PracticeSupplier provided (preferred - Phase 2)
    if (input.practiceSupplierId) {
      const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierById(
        input.practiceSupplierId,
        practiceId
      );

      // Check if supplier is blocked
      if (practiceSupplier.isBlocked) {
        throw new BusinessRuleViolationError('Cannot create order with blocked supplier');
      }

      // Derive legacy supplierId from migration tracking or find legacy supplier
      let legacySupplierId = practiceSupplier.migratedFromSupplierId;
      
      if (!legacySupplierId) {
        // If no migration tracking, this is a new PracticeSupplier
        // For backward compatibility, we still need a legacy Supplier record
        // This is a transitional state - in Phase 3+ we'll remove this requirement
        throw new ValidationError(
          'PracticeSupplier has no legacy supplier mapping. Please contact support.'
        );
      }

      // Verify legacy supplier exists
      await this.userRepository.findSupplierById(legacySupplierId, practiceId);

      return {
        supplierId: legacySupplierId,
        practiceSupplierId: input.practiceSupplierId,
      };
    }

    // Case 2: Legacy Supplier provided (fallback - backward compatibility)
    if (input.supplierId) {
      // Verify supplier exists
      await this.userRepository.findSupplierById(input.supplierId, practiceId);

      // Try to find corresponding PracticeSupplier for forward compatibility
      const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierByMigratedId(
        practiceId,
        input.supplierId
      );

      return {
        supplierId: input.supplierId,
        practiceSupplierId: practiceSupplier?.id ?? null,
      };
    }

    // Should never reach here due to validation above
    throw new ValidationError('No supplier specified');
  }

  /**
   * Get supplier display name from order (Phase 2 helper)
   * Prefers PracticeSupplier customLabel, falls back to GlobalSupplier or legacy Supplier name
   */
  private getSupplierDisplayName(order: OrderWithRelations): string {
    // Prefer PracticeSupplier info if available
    if (order.practiceSupplier) {
      return order.practiceSupplier.customLabel 
        || order.practiceSupplier.globalSupplier?.name 
        || 'Unknown';
    }

    // Fall back to legacy Supplier
    return order.supplier?.name ?? 'Unknown';
  }

  /**
   * Update order (draft orders only)
   */
  async updateOrder(
    ctx: RequestContext,
    orderId: string,
    input: UpdateOrderInput
  ): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify order exists and is DRAFT
      const existingOrder = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      if (existingOrder.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit orders that have been sent or received');
      }

      // Update order
      await this.orderRepository.updateOrder(orderId, ctx.practiceId, input, { tx });

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });
  }

  /**
   * Add item to order
   */
  async addOrderItem(
    ctx: RequestContext,
    orderId: string,
    input: AddOrderItemInput
  ): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validatePositiveQuantity(input.quantity);
    
    // Validate price if provided
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(Number(input.unitPrice));
    }

    return withTransaction(async (tx) => {
      // Verify order exists and is DRAFT
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      if (order.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit orders that have been sent or received');
      }

      // Verify item exists
      await this.inventoryRepository.findItemById(input.itemId, ctx.practiceId, { tx });

      // Check if item already in order
      const existing = await this.orderRepository.findOrderItem(
        orderId,
        input.itemId,
        { tx }
      );

      if (existing) {
        throw new ValidationError('Item already in order');
      }

      // Add item
      await this.orderRepository.addOrderItem(orderId, input, { tx });

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });
  }

  /**
   * Update order item
   */
  async updateOrderItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string,
    input: UpdateOrderItemInput
  ): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validatePositiveQuantity(input.quantity);
    
    // Validate price if provided
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(Number(input.unitPrice));
    }

    return withTransaction(async (tx) => {
      // Verify order exists and is DRAFT
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      if (order.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit orders that have been sent or received');
      }

      // Update item
      await this.orderRepository.updateOrderItem(orderId, itemId, input, { tx });

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(
    ctx: RequestContext,
    orderId: string,
    itemId: string
  ): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify order exists and is DRAFT
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      if (order.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit orders that have been sent or received');
      }

      // Remove item
      await this.orderRepository.removeOrderItem(orderId, itemId, { tx });

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });
  }

  /**
   * Send order to supplier
   */
  async sendOrder(ctx: RequestContext, orderId: string): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Get full order with items and supplier
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      // Validate order can be sent
      validateOrderCanBeSent({
        status: order.status,
        items: order.items ?? [],
        supplierId: order.supplierId,
      });

      // Update status to SENT
      const updatedOrder = await this.orderRepository.updateOrderStatus(
        orderId,
        ctx.practiceId,
        'SENT',
        { sentAt: new Date() },
        { tx }
      );

      // Calculate total amount
      const totalAmount = order.items?.reduce((sum, item) => {
        const price = item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0;
        return sum + price * item.quantity;
      }, 0) ?? 0;

      // Log audit event
      await this.auditService.logOrderSent(
        ctx,
        orderId,
        {
          supplierName: order.supplier?.name ?? 'Unknown',
          itemCount: order.items?.length ?? 0,
          totalAmount,
        },
        tx
      );

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });
  }

  /**
   * Delete order (draft orders only)
   */
  async deleteOrder(ctx: RequestContext, orderId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify order exists and is DRAFT
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      if (order.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Can only delete draft orders');
      }

      // Delete order
      await this.orderRepository.deleteOrder(orderId, ctx.practiceId, { tx });

      // Log audit event
      await this.auditService.logOrderDeleted(ctx, orderId, tx);
    });
  }

  /**
   * Create orders from low stock items
   */
  async createOrdersFromLowStock(
    ctx: RequestContext,
    selectedItemIds: string[]
  ): Promise<{
    orders: Array<{ id: string; supplierName: string }>;
    skippedItems: string[];
  }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    if (selectedItemIds.length === 0) {
      throw new ValidationError('No items selected');
    }

    return withTransaction(async (tx) => {
      // Fetch selected items with inventory and supplier info
      const items = await this.inventoryRepository.findItems(
        ctx.practiceId,
        undefined,
        { tx }
      );

      const selectedItems = items.filter((item) =>
        selectedItemIds.includes(item.id)
      );

      // Group by supplier
      const supplierGroups = new Map<
        string,
        {
          supplierName: string;
          items: Array<{ itemId: string; quantity: number; unitPrice: number | null }>;
        }
      >();

      const skippedItems: string[] = [];

      for (const item of selectedItems) {
        // Skip items without default supplier
        if (!item.defaultSupplier) {
          skippedItems.push(item.name);
          continue;
        }

        // Calculate total needed quantity from low-stock locations
        const lowStockLocations = (item.inventory ?? []).filter(
          (inv) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
        );

        if (lowStockLocations.length === 0) {
          continue;
        }

        const totalQuantity = lowStockLocations.reduce((sum, inv) => {
          return sum + (inv.reorderQuantity || inv.reorderPoint || 1);
        }, 0);

        if (totalQuantity <= 0) {
          continue;
        }

        // Get unit price from SupplierItem if available
        const supplierId = item.defaultSupplier.id;
        const matchingSupplierItem = (item as any).supplierItems?.find(
          (si: any) => si.supplierId === supplierId
        );
        const unitPrice = matchingSupplierItem?.unitPrice 
          ? parseFloat(matchingSupplierItem.unitPrice.toString())
          : null;

        // Add to supplier group
        if (!supplierGroups.has(supplierId)) {
          supplierGroups.set(supplierId, {
            supplierName: item.defaultSupplier.name,
            items: [],
          });
        }

        supplierGroups.get(supplierId)!.items.push({
          itemId: item.id,
          quantity: totalQuantity,
          unitPrice,
        });
      }

      // Create one draft order per supplier
      const createdOrders: Array<{ id: string; supplierName: string }> = [];

      for (const [supplierId, group] of supplierGroups.entries()) {
        const order = await this.orderRepository.createOrder(
          ctx.userId,
          {
            practiceId: ctx.practiceId,
            supplierId,
            notes: 'Created from low-stock items',
            items: group.items,
          },
          { tx }
        );

        createdOrders.push({
          id: order.id,
          supplierName: group.supplierName,
        });
      }

      return { orders: createdOrders, skippedItems };
    });
  }

  // ===========================
  // TEMPLATE MANAGEMENT METHODS
  // ===========================

  /**
   * Find templates
   */
  async findTemplates(ctx: RequestContext): Promise<any[]> {
    return prisma.orderTemplate.findMany({
      where: { practiceId: ctx.practiceId },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        items: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get template by ID with items
   */
  async getTemplateById(ctx: RequestContext, templateId: string): Promise<any> {
    const template = await prisma.orderTemplate.findUnique({
      where: { id: templateId, practiceId: ctx.practiceId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                defaultSupplier: {
                  select: { id: true, name: true },
                },
              },
            },
            supplier: {
              select: { id: true, name: true },
            },
          },
          orderBy: {
            item: { name: 'asc' },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return template;
  }

  /**
   * Create template
   */
  async createTemplate(
    ctx: RequestContext,
    input: {
      name: string;
      description: string | null;
      items: Array<{
        itemId: string;
        defaultQuantity: number;
        supplierId: string | null;
      }>;
    }
  ): Promise<OrderTemplate> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (input.items.length === 0) {
      throw new ValidationError('Template must have at least one item');
    }

    // Validate all items
    for (const item of input.items) {
      validatePositiveQuantity(item.defaultQuantity);
    }

    return withTransaction(async (tx) => {
      // Verify all items belong to practice
      const itemIds = input.items.map((i) => i.itemId);
      const itemsCount = await tx.item.count({
        where: {
          id: { in: itemIds },
          practiceId: ctx.practiceId,
        },
      });

      if (itemsCount !== itemIds.length) {
        throw new ValidationError('Some items do not belong to this practice');
      }

      // Create template with items
      const template = await tx.orderTemplate.create({
        data: {
          practiceId: ctx.practiceId,
          name: input.name,
          description: input.description,
          createdById: ctx.userId,
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              defaultQuantity: item.defaultQuantity,
              supplierId: item.supplierId,
            })),
          },
        },
      });

      return template;
    });
  }

  /**
   * Update template
   */
  async updateTemplate(
    ctx: RequestContext,
    templateId: string,
    input: {
      name: string;
      description: string | null;
    }
  ): Promise<OrderTemplate> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify template belongs to practice
      const template = await tx.orderTemplate.findUnique({
        where: { id: templateId, practiceId: ctx.practiceId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      // Update template
      return tx.orderTemplate.update({
        where: { id: templateId },
        data: {
          name: input.name,
          description: input.description,
        },
      });
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(ctx: RequestContext, templateId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify template belongs to practice
      const template = await tx.orderTemplate.findUnique({
        where: { id: templateId, practiceId: ctx.practiceId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      // Delete template (cascade deletes items)
      await tx.orderTemplate.delete({
        where: { id: templateId },
      });
    });
  }

  /**
   * Add item to template
   */
  async addTemplateItem(
    ctx: RequestContext,
    templateId: string,
    input: {
      itemId: string;
      defaultQuantity: number;
      supplierId: string | null;
    }
  ): Promise<OrderTemplateItem> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validatePositiveQuantity(input.defaultQuantity);

    return withTransaction(async (tx) => {
      // Verify template belongs to practice
      const template = await tx.orderTemplate.findUnique({
        where: { id: templateId, practiceId: ctx.practiceId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      // Verify item belongs to practice
      const item = await tx.item.findUnique({
        where: { id: input.itemId, practiceId: ctx.practiceId },
      });

      if (!item) {
        throw new NotFoundError('Item not found');
      }

      // Check if item already exists in template
      const existing = await tx.orderTemplateItem.findUnique({
        where: {
          templateId_itemId: {
            templateId,
            itemId: input.itemId,
          },
        },
      });

      if (existing) {
        throw new ValidationError('Item already in template');
      }

      // Add item to template
      return tx.orderTemplateItem.create({
        data: {
          templateId,
          itemId: input.itemId,
          defaultQuantity: input.defaultQuantity,
          supplierId: input.supplierId,
        },
      });
    });
  }

  /**
   * Update template item
   */
  async updateTemplateItem(
    ctx: RequestContext,
    templateItemId: string,
    input: {
      defaultQuantity: number;
      supplierId: string | null;
    }
  ): Promise<OrderTemplateItem> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validatePositiveQuantity(input.defaultQuantity);

    return withTransaction(async (tx) => {
      // Verify template item exists and belongs to practice
      const templateItem = await tx.orderTemplateItem.findUnique({
        where: { id: templateItemId },
        include: {
          template: {
            select: { practiceId: true },
          },
        },
      });

      if (!templateItem || templateItem.template.practiceId !== ctx.practiceId) {
        throw new NotFoundError('Template item not found');
      }

      // Update template item
      return tx.orderTemplateItem.update({
        where: { id: templateItemId },
        data: {
          defaultQuantity: input.defaultQuantity,
          supplierId: input.supplierId,
        },
      });
    });
  }

  /**
   * Remove item from template
   */
  async removeTemplateItem(ctx: RequestContext, templateItemId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify template item exists and belongs to practice
      const templateItem = await tx.orderTemplateItem.findUnique({
        where: { id: templateItemId },
        include: {
          template: {
            select: { practiceId: true },
          },
        },
      });

      if (!templateItem || templateItem.template.practiceId !== ctx.practiceId) {
        throw new NotFoundError('Template item not found');
      }

      // Delete template item
      await tx.orderTemplateItem.delete({
        where: { id: templateItemId },
      });
    });
  }

  /**
   * Create orders from template
   * Groups template items by supplier and creates one draft order per supplier
   */
  async createOrdersFromTemplate(
    ctx: RequestContext,
    templateId: string,
    orderData: {
      supplierId: string;
      items: Array<{ itemId: string; quantity: number; unitPrice: number | null }>;
    }[]
  ): Promise<{
    success: boolean;
    message: string;
    orders?: Array<{ id: string; supplierName: string }>;
  }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify template belongs to practice
      const template = await tx.orderTemplate.findUnique({
        where: { id: templateId, practiceId: ctx.practiceId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      if (orderData.length === 0) {
        throw new ValidationError('No orders to create');
      }

      // Create one draft order per supplier
      const createdOrders: Array<{ id: string; supplierName: string }> = [];

      for (const supplierGroup of orderData) {
        if (supplierGroup.items.length === 0) {
          continue;
        }

        // Verify supplier belongs to practice
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierGroup.supplierId, practiceId: ctx.practiceId },
        });

        if (!supplier) {
          continue; // Skip invalid suppliers
        }

        const order = await tx.order.create({
          data: {
            practiceId: ctx.practiceId,
            supplierId: supplierGroup.supplierId,
            status: 'DRAFT',
            createdById: ctx.userId,
            notes: `Created from template: ${template.name}`,
            items: {
              create: supplierGroup.items.map((item) => ({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          },
        });

        createdOrders.push({
          id: order.id,
          supplierName: supplier.name,
        });
      }

      if (createdOrders.length === 0) {
        throw new ValidationError('No valid orders could be created');
      }

      const message =
        createdOrders.length === 1
          ? `Created 1 draft order for ${createdOrders[0].supplierName}`
          : `Created ${createdOrders.length} draft orders for ${createdOrders.length} suppliers`;

      return {
        success: true,
        message,
        orders: createdOrders,
      };
    });
  }
}

// Singleton instance
let orderServiceInstance: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderServiceInstance) {
    const { getAuditService } = require('../audit/audit-service');
    const { getPracticeSupplierRepository } = require('@/src/repositories/suppliers');
    orderServiceInstance = new OrderService(
      new OrderRepository(),
      new InventoryRepository(),
      new UserRepository(),
      getPracticeSupplierRepository(),
      getAuditService()
    );
  }
  return orderServiceInstance;
}

