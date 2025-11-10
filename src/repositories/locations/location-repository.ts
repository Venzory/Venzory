/**
 * Location Repository
 * Handles all data access for location-related entities
 */

import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { Location } from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';

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

    const location = await client.location.update({
      where: { id: locationId, practiceId },
      data,
    });

    return location as Location;
  }

  /**
   * Delete location
   */
  async deleteLocation(
    locationId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.location.delete({
      where: { id: locationId, practiceId },
    });
  }
}

