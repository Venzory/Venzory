/**
 * Stock Count Repository
 * Handles all data access for stock count-related entities
 */

import { Prisma, StockCountStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { NotFoundError } from '@/src/domain/errors';

export interface StockCountSession {
  id: string;
  practiceId: string;
  locationId: string;
  status: StockCountStatus;
  createdById: string;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface StockCountLine {
  id: string;
  sessionId: string;
  itemId: string;
  countedQuantity: number;
  systemQuantity: number;
  variance: number;
  notes: string | null;
  createdAt: Date;
}

export interface StockCountSessionWithRelations extends StockCountSession {
  location?: any;
  createdBy?: any;
  lines?: any[];
}

export class StockCountRepository extends BaseRepository {
  /**
   * Find stock count sessions for a practice
   */
  async findStockCountSessions(
    practiceId: string,
    options?: FindOptions
  ): Promise<StockCountSessionWithRelations[]> {
    const client = this.getClient(options?.tx);

    const sessions = await client.stockCountSession.findMany({
      where: this.scopeToPractice(practiceId),
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        lines: {
          select: { 
            id: true, 
            variance: true,
            countedQuantity: true,
            systemQuantity: true,
          },
        },
      },
      ...this.buildPagination(options?.pagination),
    });

    return sessions as StockCountSessionWithRelations[];
  }

  /**
   * Count stock count sessions
   */
  async countStockCountSessions(
    practiceId: string
  ): Promise<number> {
    const client = this.getClient();
    return client.stockCountSession.count({
      where: this.scopeToPractice(practiceId),
    });
  }

  /**
   * Find stock count session by ID
   */
  async findStockCountSessionById(
    sessionId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<StockCountSessionWithRelations> {
    const client = this.getClient(options?.tx);

    const session = await client.stockCountSession.findUnique({
      where: { id: sessionId, practiceId },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        lines: {
          include: {
            item: {
              select: { id: true, name: true, sku: true },
            },
          },
          orderBy: {
            item: { name: 'asc' },
          },
        },
      },
    });

    return this.ensureExists(
      Promise.resolve(session as any),
      'StockCountSession',
      sessionId
    );
  }

  /**
   * Find any IN_PROGRESS stock count session for a location
   * Used to enforce single active session per location rule
   */
  async findInProgressSessionByLocation(
    practiceId: string,
    locationId: string,
    options?: FindOptions
  ): Promise<StockCountSession | null> {
    const client = this.getClient(options?.tx);

    const session = await client.stockCountSession.findFirst({
      where: {
        practiceId,
        locationId,
        status: 'IN_PROGRESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    return session as StockCountSession | null;
  }

  /**
   * Create stock count session
   */
  async createStockCountSession(
    practiceId: string,
    locationId: string,
    notes: string | null,
    createdById: string,
    options?: RepositoryOptions
  ): Promise<StockCountSession> {
    const client = this.getClient(options?.tx);

    const session = await client.stockCountSession.create({
      data: {
        practiceId,
        locationId,
        notes,
        status: 'IN_PROGRESS',
        createdById,
      },
    });

    return session as StockCountSession;
  }

  /**
   * Update stock count session status
   */
  async updateStockCountSessionStatus(
    sessionId: string,
    practiceId: string,
    status: StockCountStatus,
    completedAt?: Date,
    options?: RepositoryOptions
  ): Promise<StockCountSession> {
    const client = this.getClient(options?.tx);

    const session = await client.stockCountSession.update({
      where: { id: sessionId, practiceId },
      data: {
        status,
        ...(completedAt && { completedAt }),
      },
    });

    return session as StockCountSession;
  }

  /**
   * Delete stock count session
   */
  async deleteStockCountSession(
    sessionId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.stockCountSession.delete({
      where: { id: sessionId, practiceId },
    });
  }

  /**
   * Find stock count line by ID
   */
  async findStockCountLineById(
    lineId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    const line = await client.stockCountLine.findUnique({
      where: { id: lineId },
      include: {
        session: {
          select: { id: true, practiceId: true, status: true, locationId: true },
        },
        item: true,
      },
    });

    // Validate session belongs to practice
    if (!line || (line.session as any).practiceId !== practiceId) {
      throw new NotFoundError('StockCountLine', lineId);
    }

    return line;
  }

  /**
   * Find stock count line by session and item
   */
  async findStockCountLineBySessionAndItem(
    sessionId: string,
    itemId: string,
    options?: FindOptions
  ): Promise<StockCountLine | null> {
    const client = this.getClient(options?.tx);

    const line = await client.stockCountLine.findFirst({
      where: {
        sessionId,
        itemId,
      },
    });

    return line as StockCountLine | null;
  }

  /**
   * Create stock count line
   */
  async createStockCountLine(
    sessionId: string,
    itemId: string,
    countedQuantity: number,
    systemQuantity: number,
    variance: number,
    notes: string | null,
    options?: RepositoryOptions
  ): Promise<StockCountLine> {
    const client = this.getClient(options?.tx);

    const line = await client.stockCountLine.create({
      data: {
        sessionId,
        itemId,
        countedQuantity,
        systemQuantity,
        variance,
        notes,
      },
    });

    return line as StockCountLine;
  }

  /**
   * Update stock count line
   */
  async updateStockCountLine(
    lineId: string,
    countedQuantity: number,
    variance: number,
    practiceId: string,
    notes?: string | null,
    systemQuantity?: number,
    options?: RepositoryOptions
  ): Promise<StockCountLine> {
    const client = this.getClient(options?.tx);

    // Validate session ownership first
    await this.findStockCountLineById(lineId, practiceId, options);

    const line = await client.stockCountLine.update({
      where: { id: lineId },
      data: {
        countedQuantity,
        variance,
        ...(notes !== undefined && { notes }),
        ...(systemQuantity !== undefined && { systemQuantity }),
      },
    });

    return line as StockCountLine;
  }

  /**
   * Delete stock count line
   */
  async deleteStockCountLine(
    lineId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Validate session ownership first
    await this.findStockCountLineById(lineId, practiceId, options);

    await client.stockCountLine.delete({
      where: { id: lineId },
    });
  }

  /**
   * Detect inventory changes since count lines were created
   * Compares systemQuantity recorded in lines against current inventory
   */
  async detectInventoryChanges(
    sessionId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<{
    hasChanges: boolean;
    changes: Array<{
      itemId: string;
      itemName: string;
      systemAtCount: number;
      systemNow: number;
      difference: number;
    }>;
  }> {
    const client = this.getClient(options?.tx);

    const session = await client.stockCountSession.findUnique({
      where: { id: sessionId, practiceId },
      include: {
        lines: {
          include: {
            item: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!session) {
      return { hasChanges: false, changes: [] };
    }

    const changes: Array<{
      itemId: string;
      itemName: string;
      systemAtCount: number;
      systemNow: number;
      difference: number;
    }> = [];

    for (const line of session.lines) {
      // Get current inventory quantity
      const currentInventory = await client.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: session.locationId,
            itemId: line.itemId,
          },
        },
      });

      const systemNow = currentInventory?.quantity ?? 0;
      const systemAtCount = line.systemQuantity;

      if (systemNow !== systemAtCount) {
        changes.push({
          itemId: line.itemId,
          itemName: line.item.name,
          systemAtCount,
          systemNow,
          difference: systemNow - systemAtCount,
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changes,
    };
  }
}

