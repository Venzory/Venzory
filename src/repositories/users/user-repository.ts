/**
 * User Repository
 * Handles all data access for user and practice membership entities
 */

import { Prisma, PracticeRole, MembershipStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { User, Practice, PracticeMembership, Location, Supplier } from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';

export class UserRepository extends BaseRepository {
  /**
   * Find user by ID
   */
  async findUserById(
    userId: string,
    options?: FindOptions
  ): Promise<User | null> {
    const client = this.getClient(options?.tx);

    const user = await client.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            practice: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return user as User | null;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(
    email: string,
    options?: FindOptions
  ): Promise<User | null> {
    const client = this.getClient(options?.tx);

    const user = await client.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    return user as User | null;
  }

  /**
   * Find practice by ID
   */
  /**
   * Find practice by slug
   */
  async findPracticeBySlug(
    slug: string,
    options?: FindOptions
  ): Promise<Practice | null> {
    const client = this.getClient(options?.tx);

    const practice = await client.practice.findUnique({
      where: { slug },
    });

    return practice as Practice | null;
  }

  /**
   * Find user memberships
   */
  async findUserMemberships(
    userId: string,
    activeOnly: boolean = true,
    options?: FindOptions
  ): Promise<PracticeMembership[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.PracticeUserWhereInput = {
      userId,
    };

    if (activeOnly) {
      where.status = 'ACTIVE';
    }

    const memberships = await client.practiceUser.findMany({
      where,
      include: {
        practice: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return memberships as PracticeMembership[];
  }

  /**
   * Find practice members
   */
  async findPracticeMembers(
    practiceId: string,
    activeOnly: boolean = true,
    options?: FindOptions
  ): Promise<Array<{ user: User; membership: PracticeMembership }>> {
    const client = this.getClient(options?.tx);

    const where: Prisma.PracticeUserWhereInput = {
      practiceId,
    };

    if (activeOnly) {
      where.status = 'ACTIVE';
    }

    const memberships = await client.practiceUser.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return memberships.map((m) => ({
      user: m.user as any,
      membership: m as PracticeMembership,
    }));
  }

  /**
   * Check if user has access to practice
   */
  async hasAccessToPractice(
    userId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<boolean> {
    const client = this.getClient(options?.tx);

    const membership = await client.practiceUser.findUnique({
      where: {
        practiceId_userId: {
          practiceId,
          userId,
        },
      },
    });

    return membership !== null && membership.status === 'ACTIVE';
  }

  /**
   * Get user role in practice
   */
  async getUserRoleInPractice(
    userId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<PracticeRole | null> {
    const client = this.getClient(options?.tx);

    const membership = await client.practiceUser.findUnique({
      where: {
        practiceId_userId: {
          practiceId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return null;
    }

    return membership.role;
  }

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

  /**
   * Find suppliers for a practice
   */
  async findSuppliers(
    practiceId: string,
    options?: FindOptions
  ): Promise<Supplier[]> {
    const client = this.getClient(options?.tx);

    const suppliers = await client.supplier.findMany({
      where: this.scopeToPractice(practiceId),
      orderBy: { name: 'asc' },
    });

    return suppliers as Supplier[];
  }

  /**
   * Find supplier by ID
   */
  async findSupplierById(
    supplierId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<Supplier> {
    const client = this.getClient(options?.tx);

    const supplier = await client.supplier.findUnique({
      where: { id: supplierId, practiceId },
    });

    return this.ensureExists(Promise.resolve(supplier), 'Supplier', supplierId);
  }

  /**
   * Create supplier
   */
  async createSupplier(
    practiceId: string,
    data: {
      name: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      notes?: string | null;
    },
    options?: RepositoryOptions
  ): Promise<Supplier> {
    const client = this.getClient(options?.tx);

    const supplier = await client.supplier.create({
      data: {
        practiceId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        notes: data.notes ?? null,
      },
    });

    return supplier as Supplier;
  }

  /**
   * Update supplier
   */
  async updateSupplier(
    supplierId: string,
    practiceId: string,
    data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      notes?: string | null;
    },
    options?: RepositoryOptions
  ): Promise<Supplier> {
    const client = this.getClient(options?.tx);

    const supplier = await client.supplier.update({
      where: { id: supplierId, practiceId },
      data,
    });

    return supplier as Supplier;
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(
    supplierId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.supplier.delete({
      where: { id: supplierId, practiceId },
    });
  }

  /**
   * Find suppliers with their associated items
   */
  async findSuppliersWithItems(
    practiceId: string,
    options?: FindOptions
  ): Promise<any[]> {
    const client = this.getClient(options?.tx);

    const suppliers = await client.supplier.findMany({
      where: this.scopeToPractice(practiceId),
      orderBy: { name: 'asc' },
      include: {
        defaultItems: {
          select: { id: true, name: true, sku: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return suppliers;
  }

  /**
   * Find practice by ID
   */
  async findPracticeById(
    practiceId: string,
    options?: FindOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    const practice = await client.practice.findUnique({
      where: { id: practiceId },
      include: options?.include ?? undefined,
    });

    return practice;
  }

  /**
   * Update practice settings
   */
  async updatePractice(
    practiceId: string,
    data: any,
    options?: RepositoryOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    const practice = await client.practice.update({
      where: { id: practiceId },
      data,
    });

    return practice;
  }

  /**
   * Find practice user membership
   */
  async findPracticeUserMembership(
    practiceId: string,
    userId: string,
    options?: FindOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    return client.practiceUser.findFirst({
      where: {
        practiceId,
        userId,
      },
      include: options?.include ?? undefined,
    });
  }

  /**
   * Update practice user role
   */
  async updatePracticeUserRole(
    membershipId: string,
    role: 'VIEWER' | 'STAFF' | 'ADMIN',
    options?: RepositoryOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    return client.practiceUser.update({
      where: { id: membershipId },
      data: { role },
    });
  }

  /**
   * Count admins in practice
   */
  async countAdminsInPractice(
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.practiceUser.count({
      where: {
        practiceId,
        role: 'ADMIN',
      },
    });
  }

  /**
   * Delete practice user membership
   */
  async deletePracticeUserMembership(
    membershipId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.practiceUser.delete({
      where: { id: membershipId },
    });
  }

  /**
   * Find user invite by ID
   */
  async findUserInviteById(
    inviteId: string,
    options?: FindOptions
  ): Promise<any> {
    const client = this.getClient(options?.tx);

    return client.userInvite.findUnique({
      where: { id: inviteId },
    });
  }

  /**
   * Delete user invite
   */
  async deleteUserInvite(
    inviteId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.userInvite.delete({
      where: { id: inviteId },
    });
  }

  /**
   * Find practice users with user details
   */
  async findPracticeUsersWithDetails(
    practiceId: string,
    options?: FindOptions
  ): Promise<any[]> {
    const client = this.getClient(options?.tx);

    return client.practiceUser.findMany({
      where: {
        practiceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Find pending invites for practice
   */
  async findPendingInvites(
    practiceId: string,
    options?: FindOptions
  ): Promise<any[]> {
    const client = this.getClient(options?.tx);

    return client.userInvite.findMany({
      where: {
        practiceId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

