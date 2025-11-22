/**
 * Order Service
 * Business logic for order management
 */

import { OrderRepository } from '@/src/repositories/orders';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository, getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService, getAuditService } from '../audit/audit-service';
import { DeliveryStrategyResolver } from './delivery';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import { calculateOrderTotal, decimalToNumber } from '@/lib/prisma-transforms';
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
import logger from '@/lib/logger';
import type { OrderTemplate, OrderTemplateItem } from '@prisma/client';

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private inventoryRepository: InventoryRepository,
    private userRepository: UserRepository,
    private practiceSupplierRepository: PracticeSupplierRepository,
    private auditService: AuditService,
    private deliveryStrategyResolver: DeliveryStrategyResolver
  ) {}

  /**
   * Find orders with filters
   */
  async findOrders(
    ctx: RequestContext,
    filters?: Partial<OrderFilters>,
    options?: {
      pagination?: { page?: number; limit?: number };
      sorting?: { sortBy?: string; sortOrder?: 'asc' | 'desc' };
    }
  ): Promise<OrderWithRelations[]> {
    const orderBy = options?.sorting?.sortBy 
      ? { [options.sorting.sortBy]: options.sorting.sortOrder || 'desc' }
      : undefined;

    return this.orderRepository.findOrders(ctx.practiceId, filters, {
      pagination: {
        page: options?.pagination?.page ?? 1,
        limit: options?.pagination?.limit ?? 50,
      },
      orderBy,
    });
  }

  /**
   * Count orders with filters
   */
  async countOrders(
    ctx: RequestContext,
    filters?: Partial<OrderFilters>
  ): Promise<number> {
    return this.orderRepository.countOrders(ctx.practiceId, filters);
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

    // Validate all items
    for (const item of input.items) {
      validatePositiveQuantity(item.quantity);
    }

    // Verify PracticeSupplier exists and is not blocked
    const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierById(
      input.practiceSupplierId,
      ctx.practiceId
    );

    if (practiceSupplier.isBlocked) {
      throw new BusinessRuleViolationError('Cannot create order with blocked supplier');
    }

    return withTransaction(async (tx) => {
      // Verify all items exist (batch validation avoids N+1)
      const itemIds = input.items.map(item => item.itemId);
      const foundItemIds = await this.inventoryRepository.findItemIdsByIds(itemIds, ctx.practiceId, { tx });
      if (foundItemIds.length !== itemIds.length) {
        const missingIds = itemIds.filter(id => !foundItemIds.includes(id));
        throw new NotFoundError(`Items not found: ${missingIds.join(', ')}`);
      }

      // Create order
      const order = await this.orderRepository.createOrder(
        ctx.userId,
        {
          ...input,
          practiceId: ctx.practiceId,
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
      const totalAmount = calculateOrderTotal(fullOrder.items || []);

      // Get supplier name
      const supplierName = fullOrder.practiceSupplier?.customLabel 
        || fullOrder.practiceSupplier?.globalSupplier?.name 
        || 'Unknown';

      // Log audit event
      await this.auditService.logOrderCreated(
        ctx,
        order.id,
        {
          supplierId: input.practiceSupplierId,
          supplierName,
          itemCount: input.items.length,
          totalAmount: typeof totalAmount === 'number' ? totalAmount : decimalToNumber(totalAmount) ?? 0,
        },
        tx
      );

      return fullOrder;
    });
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
        ctx.practiceId,
        { tx }
      );

      if (existing) {
        throw new ValidationError('Item already in order');
      }

      // Add item
      await this.orderRepository.addOrderItem(orderId, ctx.practiceId, input, { tx });

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
      await this.orderRepository.updateOrderItem(orderId, itemId, ctx.practiceId, input, { tx });

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
      await this.orderRepository.removeOrderItem(orderId, itemId, ctx.practiceId, { tx });

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

    const updatedOrder = await withTransaction(async (tx) => {
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
        practiceSupplierId: order.practiceSupplierId,
      });

      // Update status to SENT
      await this.orderRepository.updateOrderStatus(
        orderId,
        ctx.practiceId,
        'SENT',
        { sentAt: new Date() },
        { tx }
      );

      // Calculate total amount
      const totalAmount = calculateOrderTotal(order.items || []);

      // Log audit event
      await this.auditService.logOrderSent(
        ctx,
        orderId,
        {
          supplierName: order.practiceSupplier?.customLabel || order.practiceSupplier?.globalSupplier?.name || 'Unknown',
          itemCount: order.items?.length ?? 0,
          totalAmount,
        },
        tx
      );

      // Return updated order
      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
    });

    // Attempt to deliver order via strategy (e.g. Email, API)
    // This is done after the transaction commits so that if delivery fails,
    // the order remains in SENT status (best effort delivery).
    try {
      const strategy = this.deliveryStrategyResolver.resolve(updatedOrder);
      const success = await strategy.send(ctx, updatedOrder);
      
      if (!success) {
        logger.warn({
          action: 'sendOrder',
          orderId,
          strategy: strategy.constructor.name
        }, 'Order delivery strategy returned false');
      }
    } catch (error) {
      // Log error but don't fail the operation
      logger.error({
        action: 'sendOrder',
        orderId,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to execute delivery strategy');
    }

    return updatedOrder;
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
   * Close order manually
   */
  async closeOrder(ctx: RequestContext, orderId: string): Promise<OrderWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify order exists
      const order = await this.orderRepository.findOrderById(
        orderId,
        ctx.practiceId,
        { tx }
      );

      // Only allow closing if SENT or PARTIALLY_RECEIVED
      if (!['SENT', 'PARTIALLY_RECEIVED'].includes(order.status)) {
        throw new BusinessRuleViolationError('Can only close orders that are Sent or Partially Received');
      }

      // Update status to RECEIVED
      await this.orderRepository.updateOrderStatus(
        orderId,
        ctx.practiceId,
        'RECEIVED',
        { receivedAt: new Date() },
        { tx }
      );

      // Log audit event
      await this.auditService.logOrderClosed(ctx, orderId, tx);

      return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
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
      // Optimized: Filter by IDs in database instead of fetching all
      const selectedItems = await this.inventoryRepository.findItems(
        ctx.practiceId,
        { itemIds: selectedItemIds },
        { tx }
      );

      // Group by practice supplier (Phase 2)
      const supplierGroups = new Map<
        string,
        {
          supplierName: string;
          items: Array<{ itemId: string; quantity: number; unitPrice: number | null }>;
        }
      >();

      const skippedItems: string[] = [];

      for (const item of selectedItems) {
        // Skip items without default practice supplier (Phase 2)
        if (!item.defaultPracticeSupplier) {
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
          // Use maxStock logic if set, otherwise reorderQuantity or reorderPoint
          let suggested = 0;
          if (inv.maxStock) {
            suggested = Math.max(0, inv.maxStock - inv.quantity);
          } else {
            suggested = inv.reorderQuantity || inv.reorderPoint || 1;
          }
          return sum + suggested;
        }, 0);

        if (totalQuantity <= 0) {
          continue;
        }

        // Get unit price from SupplierItem if available (using practiceSupplierId)
        const practiceSupplierId = item.defaultPracticeSupplier.id;
        const matchingSupplierItem = (item as any).supplierItems?.find(
          (si: any) => si.practiceSupplierId === practiceSupplierId
        );
        const unitPrice = decimalToNumber(matchingSupplierItem?.unitPrice);

        // Get supplier name (prefer custom label, fallback to global supplier name)
        const supplierName = item.defaultPracticeSupplier.customLabel 
          || item.defaultPracticeSupplier.globalSupplier?.name 
          || 'Unknown';

        // Add to supplier group
        if (!supplierGroups.has(practiceSupplierId)) {
          supplierGroups.set(practiceSupplierId, {
            supplierName,
            items: [],
          });
        }

        supplierGroups.get(practiceSupplierId)!.items.push({
          itemId: item.id,
          quantity: totalQuantity,
          unitPrice,
        });
      }

      // Create one draft order per practice supplier
      const createdOrders: Array<{ id: string; supplierName: string }> = [];

      for (const [practiceSupplierId, group] of supplierGroups.entries()) {
        const order = await this.orderRepository.createOrder(
          ctx.userId,
          {
            practiceId: ctx.practiceId,
            practiceSupplierId,
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

  /**
   * Create orders from catalog items
   * Creates draft orders for selected items with quantity 1, grouped by supplier
   */
  async createOrdersFromCatalogItems(
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
      // Using findItems to get all related data including suppliers
      // Optimized: Filter by IDs in database
      const selectedItems = await this.inventoryRepository.findItems(
        ctx.practiceId,
        { itemIds: selectedItemIds },
        { tx }
      );

      // Group by practice supplier
      const supplierGroups = new Map<
        string,
        {
          supplierName: string;
          items: Array<{ itemId: string; quantity: number; unitPrice: number | null }>;
        }
      >();

      const skippedItems: string[] = [];

      for (const item of selectedItems) {
        // Skip items without default practice supplier
        if (!item.defaultPracticeSupplier) {
          skippedItems.push(item.name);
          continue;
        }

        // Get unit price from SupplierItem if available (using practiceSupplierId)
        const practiceSupplierId = item.defaultPracticeSupplier.id;
        const matchingSupplierItem = (item as any).supplierItems?.find(
          (si: any) => si.practiceSupplierId === practiceSupplierId
        );
        const unitPrice = decimalToNumber(matchingSupplierItem?.unitPrice);

        // Get supplier name (prefer custom label, fallback to global supplier name)
        const supplierName = item.defaultPracticeSupplier.customLabel 
          || item.defaultPracticeSupplier.globalSupplier?.name 
          || 'Unknown';

        // Add to supplier group
        if (!supplierGroups.has(practiceSupplierId)) {
          supplierGroups.set(practiceSupplierId, {
            supplierName,
            items: [],
          });
        }

        // Default quantity to 1 for catalog items
        supplierGroups.get(practiceSupplierId)!.items.push({
          itemId: item.id,
          quantity: 1,
          unitPrice,
        });
      }

      // Create one draft order per practice supplier
      const createdOrders: Array<{ id: string; supplierName: string }> = [];

      for (const [practiceSupplierId, group] of supplierGroups.entries()) {
        const order = await this.orderRepository.createOrder(
          ctx.userId,
          {
            practiceId: ctx.practiceId,
            practiceSupplierId,
            notes: 'Created from catalog selection',
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
                defaultPracticeSupplierId: true,
                defaultPracticeSupplier: {
                  include: {
                    globalSupplier: true,
                  },
                },
                supplierItems: {
                  select: {
                    practiceSupplierId: true,
                    unitPrice: true,
                  },
                },
              },
            },
            practiceSupplier: {
              include: {
                globalSupplier: true,
              },
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
        practiceSupplierId: string | null;
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
              practiceSupplierId: item.practiceSupplierId,
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
      practiceSupplierId: string | null;
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
          practiceSupplierId: input.practiceSupplierId,
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
      practiceSupplierId: string | null;
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
          practiceSupplierId: input.practiceSupplierId,
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
   * Create orders from template using default quantities and suppliers
   * This is a convenience method that fetches the template, groups items by supplier,
   * and calls createOrdersFromTemplate with the default data
   */
  async createOrdersFromTemplateWithDefaults(
    ctx: RequestContext,
    templateId: string
  ): Promise<{
    success: boolean;
    message: string;
    orders?: Array<{ id: string; supplierName: string }>;
  }> {
    // Check permissions (will be checked again in createOrdersFromTemplate, but fail fast)
    requireRole(ctx, 'STAFF');

    // Fetch template with full item details
    const template = await this.getTemplateById(ctx, templateId);

    if (!template.items || template.items.length === 0) {
      throw new ValidationError('Template has no items');
    }

    // Group items by practice supplier (Phase 2)
    const supplierGroups = new Map<
      string,
      Array<{ itemId: string; quantity: number; unitPrice: number | null }>
    >();

    for (const templateItem of template.items) {
      // Use template item's practiceSupplierId, fallback to item's defaultPracticeSupplierId
      let practiceSupplierId: string | null = templateItem.practiceSupplierId || templateItem.item?.defaultPracticeSupplierId || null;

      if (!practiceSupplierId) {
        // Skip items without a practice supplier
        logger.warn({
          templateId,
          itemId: templateItem.itemId,
          itemName: templateItem.item?.name,
        }, 'Skipping template item without practice supplier');
        continue;
      }

      // Get unit price from supplier items if available (using practiceSupplierId)
      const supplierItem = (templateItem.item as any)?.supplierItems?.find(
        (si: any) => si.practiceSupplierId === practiceSupplierId
      );
      const unitPrice = supplierItem?.unitPrice ? decimalToNumber(supplierItem.unitPrice) : null;

      if (!supplierGroups.has(practiceSupplierId)) {
        supplierGroups.set(practiceSupplierId, []);
      }

      supplierGroups.get(practiceSupplierId)!.push({
        itemId: templateItem.itemId,
        quantity: templateItem.defaultQuantity,
        unitPrice,
      });
    }

    if (supplierGroups.size === 0) {
      throw new ValidationError('No valid items with suppliers found in template');
    }

    // Convert Map to array format for createOrdersFromTemplate
    const orderData = Array.from(supplierGroups.entries()).map(([practiceSupplierId, items]) => ({
      practiceSupplierId,
      items,
    }));

    // Delegate to existing method for validation, transaction handling, and order creation
    return this.createOrdersFromTemplate(ctx, templateId, orderData);
  }

  /**
   * Create orders from template
   * Groups template items by practice supplier and creates one draft order per practice supplier
   */
  async createOrdersFromTemplate(
    ctx: RequestContext,
    templateId: string,
    orderData: {
      practiceSupplierId: string;
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

      // Create one draft order per practice supplier
      const createdOrders: Array<{ id: string; supplierName: string }> = [];

      for (const supplierGroup of orderData) {
        if (supplierGroup.items.length === 0) {
          continue;
        }

        // Verify PracticeSupplier exists and belongs to this practice
        const practiceSupplier = await tx.practiceSupplier.findUnique({
          where: {
            id: supplierGroup.practiceSupplierId,
            practiceId: ctx.practiceId,
          },
          include: {
            globalSupplier: true,
          },
        });

        if (!practiceSupplier) {
          // Skip if PracticeSupplier not found
          logger.warn({
            templateId,
            practiceSupplierId: supplierGroup.practiceSupplierId,
          }, 'PracticeSupplier not found - skipping order creation');
          continue;
        }

        const order = await tx.order.create({
          data: {
            practiceId: ctx.practiceId,
            practiceSupplierId: practiceSupplier.id,
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
          supplierName: practiceSupplier.customLabel || practiceSupplier.globalSupplier.name,
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
    orderServiceInstance = new OrderService(
      new OrderRepository(),
      new InventoryRepository(),
      new UserRepository(),
      getPracticeSupplierRepository(),
      getAuditService(),
      new DeliveryStrategyResolver()
    );
  }
  return orderServiceInstance;
}
