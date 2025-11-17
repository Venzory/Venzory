/**
 * Location Repository
 * Handles all data access for location-related entities
 */

import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { Location } from '@/src/domain/models';
import { NotFoundError, BusinessRuleViolationError, ValidationError } from '@/src/domain/errors';

export class LocationRepository extends BaseRepository {
  /**
   * Find locations for a practice
   */
  async findLocations(
    practiceId: string,
    options?: FindOptions
  ): Promise<Location[]> {
    const client = this.getClient(options?.tx);

    const locations = await client.location.findMany({
      where: this.scopeToPractice(practiceId),
      orderBy: { name: 'asc' },
      include: options?.include ?? undefined,
    });

    return locations as Location[];
  }

  /**
   * Find location by ID
   */
  async findLocationById(
    locationId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<Location> {
    const client = this.getClient(options?.tx);

    const location = await client.location.findUnique({
      where: { id: locationId, practiceId },
      include: options?.include ?? undefined,
    });

    return this.ensureExists(Promise.resolve(location), 'Location', locationId);
  }

  /**
   * Create location
   */
  async createLocation(
    practiceId: string,
    data: {
      name: string;
      code?: string | null;
      description?: string | null;
      parentId?: string | null;
    },
    options?: RepositoryOptions
  ): Promise<Location> {
    const client = this.getClient(options?.tx);

    // Validate parent if provided
    if (data.parentId) {
      const parent = await client.location.findUnique({
        where: { id: data.parentId, practiceId },
      });

      if (!parent) {
        throw new ValidationError('Parent location not found or does not belong to this practice');
      }
    }

    const location = await client.location.create({
      data: {
        practiceId,
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
      },
    });

    return location as Location;
  }

  /**
   * Update location
   */
  async updateLocation(
    locationId: string,
    practiceId: string,
    data: {
      name?: string;
      code?: string | null;
      description?: string | null;
      parentId?: string | null;
    },
    options?: RepositoryOptions
  ): Promise<Location> {
    const client = this.getClient(options?.tx);

    // Validate parent if provided
    if (data.parentId !== undefined) {
      if (data.parentId === locationId) {
        throw new ValidationError('A location cannot be its own parent');
      }

      if (data.parentId) {
        const parent = await client.location.findUnique({
          where: { id: data.parentId, practiceId },
        });

        if (!parent) {
          throw new ValidationError('Parent location not found or does not belong to this practice');
        }

        // Check if the new parent is a direct child (simple cycle prevention)
        const existingLocation = await client.location.findUnique({
          where: { id: locationId, practiceId },
          include: { children: { select: { id: true } } },
        });

        if (existingLocation?.children.some((child) => child.id === data.parentId)) {
          throw new ValidationError('Cannot set a child location as parent (would create a cycle)');
        }
      }
    }

    const location = await client.location.update({
      where: { id: locationId, practiceId },
      data,
    });

    return location as Location;
  }

  /**
   * Get location usage statistics
   * Returns counts of all entities referencing this location
   */
  async getLocationUsage(
    locationId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<{
    inventoryCount: number;
    childLocationCount: number;
    stockAdjustmentCount: number;
    outgoingTransferCount: number;
    incomingTransferCount: number;
    goodsReceiptCount: number;
    stockCountSessionCount: number;
    hasUsage: boolean;
    usageSummary: string[];
  }> {
    const client = this.getClient(options?.tx);

    // Verify location exists and belongs to practice
    await this.findLocationById(locationId, practiceId, options);

    // Count all references in parallel
    const [
      inventoryCount,
      childLocationCount,
      stockAdjustmentCount,
      outgoingTransferCount,
      incomingTransferCount,
      goodsReceiptCount,
      stockCountSessionCount,
    ] = await Promise.all([
      client.locationInventory.count({
        where: { locationId },
      }),
      client.location.count({
        where: { parentId: locationId, practiceId },
      }),
      client.stockAdjustment.count({
        where: { locationId, practiceId },
      }),
      client.inventoryTransfer.count({
        where: { fromLocationId: locationId, practiceId },
      }),
      client.inventoryTransfer.count({
        where: { toLocationId: locationId, practiceId },
      }),
      client.goodsReceipt.count({
        where: { locationId, practiceId },
      }),
      client.stockCountSession.count({
        where: { locationId, practiceId },
      }),
    ]);

    // Build usage summary
    const usageSummary: string[] = [];
    if (inventoryCount > 0) {
      usageSummary.push(`${inventoryCount} inventory record${inventoryCount !== 1 ? 's' : ''}`);
    }
    if (childLocationCount > 0) {
      usageSummary.push(`${childLocationCount} sub-location${childLocationCount !== 1 ? 's' : ''}`);
    }
    if (stockAdjustmentCount > 0) {
      usageSummary.push(`${stockAdjustmentCount} stock adjustment${stockAdjustmentCount !== 1 ? 's' : ''}`);
    }
    const transferCount = outgoingTransferCount + incomingTransferCount;
    if (transferCount > 0) {
      usageSummary.push(`${transferCount} inventory transfer${transferCount !== 1 ? 's' : ''}`);
    }
    if (goodsReceiptCount > 0) {
      usageSummary.push(`${goodsReceiptCount} goods receipt${goodsReceiptCount !== 1 ? 's' : ''}`);
    }
    if (stockCountSessionCount > 0) {
      usageSummary.push(`${stockCountSessionCount} stock count session${stockCountSessionCount !== 1 ? 's' : ''}`);
    }

    const hasUsage = usageSummary.length > 0;

    return {
      inventoryCount,
      childLocationCount,
      stockAdjustmentCount,
      outgoingTransferCount,
      incomingTransferCount,
      goodsReceiptCount,
      stockCountSessionCount,
      hasUsage,
      usageSummary,
    };
  }

  /**
   * Delete location (with safety checks)
   * Throws BusinessRuleViolationError if location is in use
   */
  async deleteLocation(
    locationId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Check for usage
    const usage = await this.getLocationUsage(locationId, practiceId, options);

    if (usage.hasUsage) {
      const summary = usage.usageSummary.join(', ');
      throw new BusinessRuleViolationError(
        `Cannot delete location: it has ${summary}. Please move inventory, remove sub-locations, and ensure no active sessions or receipts reference this location before deleting.`
      );
    }

    await client.location.delete({
      where: { id: locationId, practiceId },
    });
  }
}

