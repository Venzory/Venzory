/**
 * Practice Supplier Repository
 * Manages practice-specific supplier relationships and settings
 */

import { BaseRepository, FindOptions, RepositoryOptions } from '../base/base-repository';
import type {
  PracticeSupplier,
  PracticeSupplierWithRelations,
  GlobalSupplier,
  CreatePracticeSupplierInput,
  UpdatePracticeSupplierInput,
  CreateGlobalSupplierInput,
  UpdateGlobalSupplierInput,
} from '@/src/domain/models/suppliers';

/**
 * Repository for managing PracticeSupplier and GlobalSupplier entities
 */
export class PracticeSupplierRepository extends BaseRepository {
  /**
   * Find all practice suppliers for a practice
   */
  async findPracticeSuppliers(
    practiceId: string,
    options?: FindOptions & {
      includeBlocked?: boolean;
      preferredOnly?: boolean;
    }
  ): Promise<PracticeSupplierWithRelations[]> {
    const client = this.getClient(options?.tx);

    const where: any = {
      practiceId,
    };

    // Filter out blocked suppliers by default
    if (!options?.includeBlocked) {
      where.isBlocked = false;
    }

    // Filter for preferred suppliers only
    if (options?.preferredOnly) {
      where.isPreferred = true;
    }

    const practiceSuppliers = await client.practiceSupplier.findMany({
      where,
      include: {
        globalSupplier: true,
        practice: options?.include?.practice ? true : false,
      },
      orderBy: [
        { isPreferred: 'desc' },
        { globalSupplier: { name: 'asc' } },
      ],
    });

    return practiceSuppliers as PracticeSupplierWithRelations[];
  }

  /**
   * Find practice supplier by ID
   */
  async findPracticeSupplierById(
    id: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<PracticeSupplierWithRelations> {
    const client = this.getClient(options?.tx);

    const practiceSupplier = await client.practiceSupplier.findUnique({
      where: { id, practiceId },
      include: {
        globalSupplier: true,
        practice: options?.include?.practice ? true : false,
      },
    });

    return this.ensureExists(
      Promise.resolve(practiceSupplier),
      'PracticeSupplier',
      id
    ) as Promise<PracticeSupplierWithRelations>;
  }

  /**
   * Find practice supplier by global supplier ID
   */
  async findPracticeSupplierByGlobalId(
    practiceId: string,
    globalSupplierId: string,
    options?: FindOptions
  ): Promise<PracticeSupplierWithRelations | null> {
    const client = this.getClient(options?.tx);

    const practiceSupplier = await client.practiceSupplier.findUnique({
      where: {
        practiceId_globalSupplierId: {
          practiceId,
          globalSupplierId,
        },
      },
      include: {
        globalSupplier: true,
        practice: options?.include?.practice ? true : false,
      },
    });

    return practiceSupplier as PracticeSupplierWithRelations | null;
  }


  /**
   * Create a link between practice and global supplier
   */
  async linkPracticeToGlobalSupplier(
    input: CreatePracticeSupplierInput,
    options?: RepositoryOptions
  ): Promise<PracticeSupplierWithRelations> {
    const client = this.getClient(options?.tx);

    const practiceSupplier = await client.practiceSupplier.create({
      data: {
        practiceId: input.practiceId,
        globalSupplierId: input.globalSupplierId,
        accountNumber: input.accountNumber ?? null,
        customLabel: input.customLabel ?? null,
        orderingNotes: input.orderingNotes ?? null,
        isPreferred: input.isPreferred ?? false,
        isBlocked: input.isBlocked ?? false,
      },
      include: {
        globalSupplier: true,
        practice: true,
      },
    });

    return practiceSupplier as PracticeSupplierWithRelations;
  }

  /**
   * Update practice supplier settings
   */
  async updatePracticeSupplier(
    id: string,
    practiceId: string,
    input: UpdatePracticeSupplierInput,
    options?: RepositoryOptions
  ): Promise<PracticeSupplierWithRelations> {
    const client = this.getClient(options?.tx);

    const practiceSupplier = await client.practiceSupplier.update({
      where: {
        id,
        practiceId,
      },
      data: input,
      include: {
        globalSupplier: true,
        practice: true,
      },
    });

    return practiceSupplier as PracticeSupplierWithRelations;
  }

  /**
   * Delete practice supplier link
   */
  async unlinkPracticeSupplier(
    id: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.practiceSupplier.delete({
      where: {
        id,
        practiceId,
      },
    });
  }

  // === Global Supplier Methods ===

  /**
   * Find all global suppliers
   */
  async findGlobalSuppliers(
    options?: FindOptions & {
      search?: string;
    }
  ): Promise<GlobalSupplier[]> {
    const client = this.getClient(options?.tx);

    const searchFilter = options?.search
      ? this.buildSearchFilter(options.search, ['name', 'email'])
      : undefined;

    const globalSuppliers = await client.globalSupplier.findMany({
      where: searchFilter,
      orderBy: { name: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return globalSuppliers as GlobalSupplier[];
  }

  /**
   * Find global supplier by ID
   */
  async findGlobalSupplierById(
    id: string,
    options?: FindOptions
  ): Promise<GlobalSupplier> {
    const client = this.getClient(options?.tx);

    const globalSupplier = await client.globalSupplier.findUnique({
      where: { id },
    });

    return this.ensureExists(
      Promise.resolve(globalSupplier),
      'GlobalSupplier',
      id
    ) as Promise<GlobalSupplier>;
  }

  /**
   * Find global supplier by name (exact match)
   */
  async findGlobalSupplierByName(
    name: string,
    options?: FindOptions
  ): Promise<GlobalSupplier | null> {
    const client = this.getClient(options?.tx);

    const globalSupplier = await client.globalSupplier.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    return globalSupplier as GlobalSupplier | null;
  }

  /**
   * Create global supplier
   */
  async createGlobalSupplier(
    input: CreateGlobalSupplierInput,
    options?: RepositoryOptions
  ): Promise<GlobalSupplier> {
    const client = this.getClient(options?.tx);

    const globalSupplier = await client.globalSupplier.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        notes: input.notes ?? null,
      },
    });

    return globalSupplier as GlobalSupplier;
  }

  /**
   * Update global supplier
   */
  async updateGlobalSupplier(
    id: string,
    input: UpdateGlobalSupplierInput,
    options?: RepositoryOptions
  ): Promise<GlobalSupplier> {
    const client = this.getClient(options?.tx);

    const globalSupplier = await client.globalSupplier.update({
      where: { id },
      data: input,
    });

    return globalSupplier as GlobalSupplier;
  }

  /**
   * Delete global supplier
   * Note: This will cascade delete all PracticeSupplier links
   */
  async deleteGlobalSupplier(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.globalSupplier.delete({
      where: { id },
    });
  }

  /**
   * Find or create global supplier by name
   * Useful for migrations and deduplication
   */
  async findOrCreateGlobalSupplier(
    input: CreateGlobalSupplierInput,
    options?: RepositoryOptions
  ): Promise<{ globalSupplier: GlobalSupplier; created: boolean }> {
    const existing = await this.findGlobalSupplierByName(input.name, options);

    if (existing) {
      return { globalSupplier: existing, created: false };
    }

    const created = await this.createGlobalSupplier(input, options);
    return { globalSupplier: created, created: true };
  }
}

// Singleton instance
let practiceSupplierRepositoryInstance: PracticeSupplierRepository | null = null;

export function getPracticeSupplierRepository(
  prisma?: any
): PracticeSupplierRepository {
  if (!practiceSupplierRepositoryInstance) {
    practiceSupplierRepositoryInstance = new PracticeSupplierRepository(prisma);
  }
  return practiceSupplierRepositoryInstance;
}

