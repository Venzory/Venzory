/**
 * GdsnSubscription Repository (GS1 Foundation - Phase 1)
 * Handles data access for GDSN subscription management
 */

import { Prisma, SubscriptionStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for GDSN subscriptions
export interface GdsnSubscription {
  id: string;
  dataPoolId: string;
  subscriptionId: string;
  targetGln: string;
  sourceGln: string | null;
  gpcCategory: string | null;
  targetMarket: string | null;
  status: SubscriptionStatus;
  activatedAt: Date | null;
  lastCinReceived: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionInput {
  dataPoolId: string;
  subscriptionId: string;
  targetGln: string;
  sourceGln?: string | null;
  gpcCategory?: string | null;
  targetMarket?: string | null;
  status?: SubscriptionStatus;
  notes?: string | null;
}

export interface UpdateSubscriptionInput {
  sourceGln?: string | null;
  gpcCategory?: string | null;
  targetMarket?: string | null;
  status?: SubscriptionStatus;
  activatedAt?: Date | null;
  lastCinReceived?: Date | null;
  notes?: string | null;
}

export interface SubscriptionFilters {
  dataPoolId?: string;
  targetGln?: string;
  status?: SubscriptionStatus;
  sourceGln?: string;
}

export class SubscriptionRepository extends BaseRepository {
  /**
   * Find all subscriptions
   */
  async findAll(
    options?: FindOptions
  ): Promise<GdsnSubscription[]> {
    const client = this.getClient(options?.tx);

    const subscriptions = await client.gdsnSubscription.findMany({
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return subscriptions as GdsnSubscription[];
  }

  /**
   * Find subscription by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<GdsnSubscription | null> {
    const client = this.getClient(options?.tx);

    const subscription = await client.gdsnSubscription.findUnique({
      where: { id },
    });

    return subscription as GdsnSubscription | null;
  }

  /**
   * Find subscription by subscription ID (from data pool)
   */
  async findBySubscriptionId(
    subscriptionId: string,
    options?: FindOptions
  ): Promise<GdsnSubscription | null> {
    const client = this.getClient(options?.tx);

    const subscription = await client.gdsnSubscription.findUnique({
      where: { subscriptionId },
    });

    return subscription as GdsnSubscription | null;
  }

  /**
   * Find subscriptions by target GLN
   */
  async findByTargetGln(
    targetGln: string,
    options?: FindOptions
  ): Promise<GdsnSubscription[]> {
    const client = this.getClient(options?.tx);

    const subscriptions = await client.gdsnSubscription.findMany({
      where: { targetGln },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions as GdsnSubscription[];
  }

  /**
   * Find subscriptions with filters
   */
  async findWithFilters(
    filters: SubscriptionFilters,
    options?: FindOptions
  ): Promise<GdsnSubscription[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.GdsnSubscriptionWhereInput = {};

    if (filters.dataPoolId) {
      where.dataPoolId = filters.dataPoolId;
    }
    if (filters.targetGln) {
      where.targetGln = filters.targetGln;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.sourceGln) {
      where.sourceGln = filters.sourceGln;
    }

    const subscriptions = await client.gdsnSubscription.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return subscriptions as GdsnSubscription[];
  }

  /**
   * Find active subscriptions
   */
  async findActive(
    options?: FindOptions
  ): Promise<GdsnSubscription[]> {
    const client = this.getClient(options?.tx);

    const subscriptions = await client.gdsnSubscription.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return subscriptions as GdsnSubscription[];
  }

  /**
   * Create subscription
   */
  async create(
    input: CreateSubscriptionInput,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    const client = this.getClient(options?.tx);

    const subscription = await client.gdsnSubscription.create({
      data: {
        dataPoolId: input.dataPoolId,
        subscriptionId: input.subscriptionId,
        targetGln: input.targetGln,
        sourceGln: input.sourceGln ?? null,
        gpcCategory: input.gpcCategory ?? null,
        targetMarket: input.targetMarket ?? null,
        status: input.status ?? 'PENDING',
        notes: input.notes ?? null,
      },
    });

    return subscription as GdsnSubscription;
  }

  /**
   * Update subscription
   */
  async update(
    id: string,
    input: UpdateSubscriptionInput,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    const client = this.getClient(options?.tx);

    const subscription = await client.gdsnSubscription.update({
      where: { id },
      data: {
        sourceGln: input.sourceGln,
        gpcCategory: input.gpcCategory,
        targetMarket: input.targetMarket,
        status: input.status,
        activatedAt: input.activatedAt,
        lastCinReceived: input.lastCinReceived,
        notes: input.notes,
      },
    });

    return subscription as GdsnSubscription;
  }

  /**
   * Activate subscription
   */
  async activate(
    id: string,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    return this.update(id, {
      status: 'ACTIVE',
      activatedAt: new Date(),
    }, options);
  }

  /**
   * Suspend subscription
   */
  async suspend(
    id: string,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    return this.update(id, {
      status: 'SUSPENDED',
    }, options);
  }

  /**
   * Cancel subscription
   */
  async cancel(
    id: string,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    return this.update(id, {
      status: 'CANCELLED',
    }, options);
  }

  /**
   * Record CIN received
   */
  async recordCinReceived(
    id: string,
    options?: RepositoryOptions
  ): Promise<GdsnSubscription> {
    return this.update(id, {
      lastCinReceived: new Date(),
    }, options);
  }

  /**
   * Delete subscription
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.gdsnSubscription.delete({
      where: { id },
    });
  }

  /**
   * Count subscriptions by status
   */
  async countByStatus(
    options?: FindOptions
  ): Promise<Record<SubscriptionStatus, number>> {
    const client = this.getClient(options?.tx);

    const counts = await client.gdsnSubscription.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<SubscriptionStatus, number> = {
      PENDING: 0,
      ACTIVE: 0,
      SUSPENDED: 0,
      CANCELLED: 0,
    };

    for (const count of counts) {
      result[count.status] = count._count;
    }

    return result;
  }

  /**
   * Find subscriptions that haven't received CIN in a while
   */
  async findStale(
    staleDays: number = 7,
    options?: FindOptions
  ): Promise<GdsnSubscription[]> {
    const client = this.getClient(options?.tx);

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    const subscriptions = await client.gdsnSubscription.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { lastCinReceived: null },
          { lastCinReceived: { lt: staleDate } },
        ],
      },
      orderBy: { lastCinReceived: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return subscriptions as GdsnSubscription[];
  }
}

