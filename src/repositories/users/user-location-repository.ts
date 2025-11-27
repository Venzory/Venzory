/**
 * User Location Repository
 * Handles user location access assignments
 */

import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

export interface UserLocationAssignment {
  id: string;
  practiceUserId: string;
  locationId: string;
  createdAt: Date;
}

export interface UserLocationWithDetails {
  id: string;
  practiceUserId: string;
  locationId: string;
  createdAt: Date;
  location: {
    id: string;
    name: string;
    code: string | null;
  };
}

export class UserLocationRepository extends BaseRepository {
  /**
   * Get all location assignments for a practice user
   */
  async findUserLocations(
    practiceUserId: string,
    options?: FindOptions
  ): Promise<UserLocationWithDetails[]> {
    const client = this.getClient(options?.tx);

    const assignments = await client.practiceUserLocation.findMany({
      where: { practiceUserId },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { location: { name: 'asc' } },
    });

    return assignments as UserLocationWithDetails[];
  }

  /**
   * Get all users with access to a specific location
   */
  async findLocationUsers(
    locationId: string,
    options?: FindOptions
  ): Promise<UserLocationAssignment[]> {
    const client = this.getClient(options?.tx);

    const assignments = await client.practiceUserLocation.findMany({
      where: { locationId },
      include: options?.include,
    });

    return assignments as UserLocationAssignment[];
  }

  /**
   * Assign a user to a location
   */
  async assignUserToLocation(
    practiceUserId: string,
    locationId: string,
    options?: RepositoryOptions
  ): Promise<UserLocationAssignment> {
    const client = this.getClient(options?.tx);

    const assignment = await client.practiceUserLocation.create({
      data: {
        practiceUserId,
        locationId,
      },
    });

    return assignment as UserLocationAssignment;
  }

  /**
   * Assign a user to multiple locations (replacing existing assignments)
   */
  async setUserLocations(
    practiceUserId: string,
    locationIds: string[],
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Delete existing assignments
    await client.practiceUserLocation.deleteMany({
      where: { practiceUserId },
    });

    // Create new assignments
    if (locationIds.length > 0) {
      await client.practiceUserLocation.createMany({
        data: locationIds.map((locationId) => ({
          practiceUserId,
          locationId,
        })),
      });
    }
  }

  /**
   * Remove a user from a location
   */
  async removeUserFromLocation(
    practiceUserId: string,
    locationId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.practiceUserLocation.deleteMany({
      where: {
        practiceUserId,
        locationId,
      },
    });
  }

  /**
   * Remove all location assignments for a user
   */
  async removeAllUserLocations(
    practiceUserId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.practiceUserLocation.deleteMany({
      where: { practiceUserId },
    });
  }

  /**
   * Check if a user has access to a specific location
   */
  async hasLocationAccess(
    practiceUserId: string,
    locationId: string,
    options?: FindOptions
  ): Promise<boolean> {
    const client = this.getClient(options?.tx);

    const assignment = await client.practiceUserLocation.findUnique({
      where: {
        practiceUserId_locationId: {
          practiceUserId,
          locationId,
        },
      },
    });

    return !!assignment;
  }

  /**
   * Get location IDs a user has access to
   */
  async getUserLocationIds(
    practiceUserId: string,
    options?: FindOptions
  ): Promise<string[]> {
    const client = this.getClient(options?.tx);

    const assignments = await client.practiceUserLocation.findMany({
      where: { practiceUserId },
      select: { locationId: true },
    });

    return assignments.map((a) => a.locationId);
  }

  /**
   * Assign all locations in a practice to a user (for OWNER/ADMIN roles)
   */
  async assignAllPracticeLocations(
    practiceUserId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Get all locations for the practice
    const locations = await client.location.findMany({
      where: { practiceId },
      select: { id: true },
    });

    // Set user locations
    await this.setUserLocations(
      practiceUserId,
      locations.map((l) => l.id),
      options
    );
  }
}

export const userLocationRepository = new UserLocationRepository();

