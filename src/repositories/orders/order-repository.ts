/**
 * Order Repository
 * Handles all data access for order-related entities
 */

import { Prisma, OrderStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import type { TransactionClient } from '../base/transaction';
import {
  Order,
  OrderWithRelations,
  OrderItem,
  OrderTemplate,
  OrderTemplateItem,
  CreateOrderInput,
  UpdateOrderInput,
  CreateOrderItemInput,
  UpdateOrderItemInput,
  AddOrderItemInput,
  OrderFilters,
  OrderSummary,
} from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';
import { calculateOrderTotal } from '@/lib/prisma-transforms';

export class OrderRepository extends BaseRepository {
  /**
   * Find orders by practice with optional filters
   */
  async findOrders(
    practiceId: string,
    filters?: Partial<OrderFilters>,
    options?: FindOptions
  ): Promise<OrderWithRelations[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.OrderWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters?.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const orders = await client.order.findMany({
      where,
      include: {
        practiceSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        items: {
          include: {
            item: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return orders as OrderWithRelations[];
  }

  /**
   * Count orders
   */
  async countOrders(
    practiceId: string,
    filters?: Partial<OrderFilters>
  ): Promise<number> {
    const client = this.getClient();
    
    const where: Prisma.OrderWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters?.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return client.order.count({ where });
  }

  /**
   * Find order by ID
   */
  async findOrderById(
    orderId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<OrderWithRelations> {
    const client = this.getClient(options?.tx);

    const order = await client.order.findUnique({
      where: { id: orderId, practiceId },
      include: {
        practiceSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        items: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        practice: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
      },
    });

    return this.ensureExists(Promise.resolve(order as any), 'Order', orderId);
  }

  /**
   * Create new order
   */
  async createOrder(
    createdById: string,
    input: CreateOrderInput,
    options?: RepositoryOptions
  ): Promise<Order> {
    const client = this.getClient(options?.tx);

    const order = await client.order.create({
      data: {
        practiceId: input.practiceId,
        practiceSupplierId: input.practiceSupplierId,
        status: OrderStatus.DRAFT,
        createdById,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        expectedAt: input.expectedAt ?? null,
        items: {
          create: input.items.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? null,
            notes: item.notes ?? null,
          })),
        },
      },
    });

    return order as Order;
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    practiceId: string,
    input: UpdateOrderInput,
    options?: RepositoryOptions
  ): Promise<Order> {
    const client = this.getClient(options?.tx);

    const order = await client.order.update({
      where: { id: orderId, practiceId },
      data: {
        reference: input.reference,
        notes: input.notes,
        expectedAt: input.expectedAt,
      },
    });

    return order as Order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    practiceId: string,
    status: OrderStatus,
    timestamps?: {
      sentAt?: Date;
      receivedAt?: Date;
    },
    options?: RepositoryOptions
  ): Promise<Order> {
    const client = this.getClient(options?.tx);

    const order = await client.order.update({
      where: { id: orderId, practiceId },
      data: {
        status,
        ...(timestamps?.sentAt && { sentAt: timestamps.sentAt }),
        ...(timestamps?.receivedAt && { receivedAt: timestamps.receivedAt }),
      },
    });

    return order as Order;
  }

  /**
   * Delete order
   */
  async deleteOrder(
    orderId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.order.delete({
      where: { id: orderId, practiceId },
    });
  }

  /**
   * Find order item
   */
  async findOrderItem(
    orderId: string,
    itemId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<OrderItem | null> {
    const client = this.getClient(options?.tx);

    // Validate order ownership first
    await this.findOrderById(orderId, practiceId, options);

    const orderItem = await client.orderItem.findUnique({
      where: {
        orderId_itemId: { orderId, itemId },
      },
      include: options?.include ?? undefined,
    });

    return orderItem as OrderItem | null;
  }

  /**
   * Add item to order
   */
  async addOrderItem(
    orderId: string,
    practiceId: string,
    input: AddOrderItemInput,
    options?: RepositoryOptions
  ): Promise<OrderItem> {
    const client = this.getClient(options?.tx);

    // Validate order ownership first
    await this.findOrderById(orderId, practiceId, options);

    const orderItem = await client.orderItem.create({
      data: {
        orderId,
        itemId: input.itemId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
      },
    });

    return orderItem as OrderItem;
  }

  /**
   * Update order item
   */
  async updateOrderItem(
    orderId: string,
    itemId: string,
    practiceId: string,
    input: UpdateOrderItemInput,
    options?: RepositoryOptions
  ): Promise<OrderItem> {
    const client = this.getClient(options?.tx);

    // Validate order ownership first
    await this.findOrderById(orderId, practiceId, options);

    const orderItem = await client.orderItem.update({
      where: {
        orderId_itemId: { orderId, itemId },
      },
      data: {
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        notes: input.notes,
      },
    });

    return orderItem as OrderItem;
  }

  /**
   * Upsert order item
   */
  async upsertOrderItem(
    orderId: string,
    itemId: string,
    input: UpdateOrderItemInput,
    options?: RepositoryOptions
  ): Promise<OrderItem> {
    const client = this.getClient(options?.tx);

    const orderItem = await client.orderItem.upsert({
      where: {
        orderId_itemId: { orderId, itemId },
      },
      create: {
        orderId,
        itemId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
        notes: input.notes ?? null,
      },
      update: {
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        notes: input.notes,
      },
    });

    return orderItem as OrderItem;
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(
    orderId: string,
    itemId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Validate order ownership first
    await this.findOrderById(orderId, practiceId, options);

    await client.orderItem.delete({
      where: {
        orderId_itemId: { orderId, itemId },
      },
    });
  }

  /**
   * Find order templates for a practice
   */
  async findOrderTemplates(
    practiceId: string,
    options?: FindOptions
  ): Promise<OrderTemplate[]> {
    const client = this.getClient(options?.tx);

    const templates = await client.orderTemplate.findMany({
      where: this.scopeToPractice(practiceId),
      include: {
        items: {
          include: {
            item: {
              select: { id: true, name: true, sku: true },
            },
            practiceSupplier: {
              select: { 
                id: true, 
                customLabel: true,
                globalSupplier: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return templates as OrderTemplate[];
  }

  /**
   * Find order template by ID
   */
  async findOrderTemplateById(
    templateId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<OrderTemplate> {
    const client = this.getClient(options?.tx);

    const template = await client.orderTemplate.findUnique({
      where: { id: templateId, practiceId },
      include: {
        items: {
          include: {
            item: true,
            practiceSupplier: {
              include: {
                globalSupplier: true,
              },
            },
          },
        },
      },
    });

    return this.ensureExists(Promise.resolve(template), 'OrderTemplate', templateId);
  }


  /**
   * Delete order template
   */
  async deleteOrderTemplate(
    templateId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.orderTemplate.delete({
      where: { id: templateId, practiceId },
    });
  }

  /**
   * Get order summaries (for lists)
   */
  async getOrderSummaries(
    practiceId: string,
    filters?: Partial<OrderFilters>,
    options?: FindOptions
  ): Promise<OrderSummary[]> {
    const client = this.getClient(options?.tx);
    
    const where: Prisma.OrderWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    // Apply filters (same logic as findOrders)
    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters?.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // Optimized query selecting only necessary fields
    const orders = await client.order.findMany({
      where,
      select: {
        id: true,
        reference: true,
        status: true,
        createdAt: true,
        sentAt: true,
        practiceSupplier: {
          select: {
            customLabel: true,
            globalSupplier: {
              select: { name: true }
            }
          }
        },
        items: {
          select: {
            quantity: true,
            unitPrice: true
          }
        }
      },
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      supplierName: order.practiceSupplier?.customLabel || order.practiceSupplier?.globalSupplier?.name || 'Unknown',
      status: order.status,
      itemCount: order.items?.length ?? 0,
      totalAmount: calculateOrderTotal(order.items || []),
      createdAt: order.createdAt,
      sentAt: order.sentAt,
    }));
  }
}

