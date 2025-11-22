/**
 * Audit Repository
 * Handles all data access for audit logging
 */

import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

export interface AuditLog {
  id: string;
  practiceId: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  practiceId: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export interface AuditLogFilters {
  practiceId: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AuditRepository extends BaseRepository {
  /**
   * Create audit log entry
   */
  async createAuditLog(
    input: CreateAuditLogInput,
    options?: RepositoryOptions
  ): Promise<AuditLog> {
    const client = this.getClient(options?.tx);

    const auditLog = await client.auditLog.create({
      data: {
        practiceId: input.practiceId,
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        changes: input.changes as Prisma.InputJsonValue,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    return auditLog as AuditLog;
  }

  /**
   * Find audit logs with filters
   */
  async findAuditLogs(
    filters: Partial<AuditLogFilters>,
    options?: FindOptions
  ): Promise<AuditLog[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.practiceId) {
      where.practiceId = filters.practiceId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const auditLogs = await client.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return auditLogs as AuditLog[];
  }

  /**
   * Find audit logs for a specific entity
   */
  async findAuditLogsForEntity(
    entityType: string,
    entityId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<AuditLog[]> {
    return this.findAuditLogs(
      {
        practiceId,
        entityType,
        entityId,
      },
      options
    );
  }

  /**
   * Count audit logs
   */
  async countAuditLogs(filters: Partial<AuditLogFilters>): Promise<number> {
    const client = this.getClient();

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.practiceId) {
      where.practiceId = filters.practiceId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    return client.auditLog.count({ where });
  }

  /**
   * Delete old audit logs
   */
  async deleteOldLogs(
    cutoffDate: Date,
    limit: number = 1000,
    options?: RepositoryOptions
  ): Promise<{ count: number }> {
    const client = this.getClient(options?.tx);

    // Find IDs first to avoid long-running delete transactions if possible,
    // or just use deleteMany directly. 
    // The original cron job logic did findMany then deleteMany.
    // We can replicate that or just use deleteMany if the batch size is small.
    // Let's stick to the simple deleteMany for now, but with a limit if Prisma supports it (it doesn't natively in deleteMany without raw query or ID fetch).
    // Actually, standard Prisma deleteMany doesn't support 'take'. 
    // So we must find IDs first.

    const logsToDelete = await client.auditLog.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
      },
      take: limit,
    });

    if (logsToDelete.length === 0) {
      return { count: 0 };
    }

    const ids = logsToDelete.map((log) => log.id);

    const result = await client.auditLog.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return { count: result.count };
  }
}

