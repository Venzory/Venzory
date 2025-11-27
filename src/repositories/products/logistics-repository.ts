/**
 * ProductLogistics Repository (GS1 Foundation - Phase 1)
 * Handles data access for product logistics and storage information
 */

import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for logistics
export interface ProductLogistics {
  id: string;
  productId: string;
  storageTemp: string | null;
  storageHumidity: string | null;
  isHazardous: boolean;
  hazardClass: string | null;
  shelfLifeDays: number | null;
  useByDateFormat: string | null;
  countryOfOrigin: string | null;
  hsCode: string | null;
  customsDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLogisticsInput {
  productId: string;
  storageTemp?: string | null;
  storageHumidity?: string | null;
  isHazardous?: boolean;
  hazardClass?: string | null;
  shelfLifeDays?: number | null;
  useByDateFormat?: string | null;
  countryOfOrigin?: string | null;
  hsCode?: string | null;
  customsDescription?: string | null;
}

export interface UpdateLogisticsInput {
  storageTemp?: string | null;
  storageHumidity?: string | null;
  isHazardous?: boolean;
  hazardClass?: string | null;
  shelfLifeDays?: number | null;
  useByDateFormat?: string | null;
  countryOfOrigin?: string | null;
  hsCode?: string | null;
  customsDescription?: string | null;
}

export class LogisticsRepository extends BaseRepository {
  /**
   * Find logistics for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductLogistics | null> {
    const client = this.getClient(options?.tx);

    const logistics = await client.productLogistics.findUnique({
      where: { productId },
    });

    return logistics as ProductLogistics | null;
  }

  /**
   * Find logistics by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductLogistics | null> {
    const client = this.getClient(options?.tx);

    const logistics = await client.productLogistics.findUnique({
      where: { id },
    });

    return logistics as ProductLogistics | null;
  }

  /**
   * Create logistics record
   */
  async create(
    input: CreateLogisticsInput,
    options?: RepositoryOptions
  ): Promise<ProductLogistics> {
    const client = this.getClient(options?.tx);

    const logistics = await client.productLogistics.create({
      data: {
        productId: input.productId,
        storageTemp: input.storageTemp ?? null,
        storageHumidity: input.storageHumidity ?? null,
        isHazardous: input.isHazardous ?? false,
        hazardClass: input.hazardClass ?? null,
        shelfLifeDays: input.shelfLifeDays ?? null,
        useByDateFormat: input.useByDateFormat ?? null,
        countryOfOrigin: input.countryOfOrigin ?? null,
        hsCode: input.hsCode ?? null,
        customsDescription: input.customsDescription ?? null,
      },
    });

    return logistics as ProductLogistics;
  }

  /**
   * Update logistics record
   */
  async update(
    id: string,
    input: UpdateLogisticsInput,
    options?: RepositoryOptions
  ): Promise<ProductLogistics> {
    const client = this.getClient(options?.tx);

    const logistics = await client.productLogistics.update({
      where: { id },
      data: {
        storageTemp: input.storageTemp,
        storageHumidity: input.storageHumidity,
        isHazardous: input.isHazardous,
        hazardClass: input.hazardClass,
        shelfLifeDays: input.shelfLifeDays,
        useByDateFormat: input.useByDateFormat,
        countryOfOrigin: input.countryOfOrigin,
        hsCode: input.hsCode,
        customsDescription: input.customsDescription,
      },
    });

    return logistics as ProductLogistics;
  }

  /**
   * Upsert logistics by product ID (one-to-one relation)
   */
  async upsert(
    productId: string,
    input: Omit<CreateLogisticsInput, 'productId'>,
    options?: RepositoryOptions
  ): Promise<ProductLogistics> {
    const client = this.getClient(options?.tx);

    const logistics = await client.productLogistics.upsert({
      where: { productId },
      create: {
        productId,
        storageTemp: input.storageTemp ?? null,
        storageHumidity: input.storageHumidity ?? null,
        isHazardous: input.isHazardous ?? false,
        hazardClass: input.hazardClass ?? null,
        shelfLifeDays: input.shelfLifeDays ?? null,
        useByDateFormat: input.useByDateFormat ?? null,
        countryOfOrigin: input.countryOfOrigin ?? null,
        hsCode: input.hsCode ?? null,
        customsDescription: input.customsDescription ?? null,
      },
      update: {
        storageTemp: input.storageTemp,
        storageHumidity: input.storageHumidity,
        isHazardous: input.isHazardous,
        hazardClass: input.hazardClass,
        shelfLifeDays: input.shelfLifeDays,
        useByDateFormat: input.useByDateFormat,
        countryOfOrigin: input.countryOfOrigin,
        hsCode: input.hsCode,
        customsDescription: input.customsDescription,
      },
    });

    return logistics as ProductLogistics;
  }

  /**
   * Delete logistics record
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productLogistics.delete({
      where: { id },
    });
  }

  /**
   * Delete logistics by product ID
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productLogistics.delete({
      where: { productId },
    }).catch(() => {
      // Ignore if not exists
    });
  }

  /**
   * Find hazardous products
   */
  async findHazardous(
    options?: FindOptions
  ): Promise<ProductLogistics[]> {
    const client = this.getClient(options?.tx);

    const records = await client.productLogistics.findMany({
      where: { isHazardous: true },
      orderBy: { hazardClass: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductLogistics[];
  }

  /**
   * Find products by country of origin
   */
  async findByCountryOfOrigin(
    countryCode: string,
    options?: FindOptions
  ): Promise<ProductLogistics[]> {
    const client = this.getClient(options?.tx);

    const records = await client.productLogistics.findMany({
      where: { countryOfOrigin: countryCode },
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductLogistics[];
  }

  /**
   * Find products requiring cold storage
   */
  async findColdStorage(
    options?: FindOptions
  ): Promise<ProductLogistics[]> {
    const client = this.getClient(options?.tx);

    const records = await client.productLogistics.findMany({
      where: {
        storageTemp: { not: null },
        // Filter for cold storage temps (containing numbers below room temp)
        OR: [
          { storageTemp: { contains: '2-8' } },
          { storageTemp: { contains: '-20' } },
          { storageTemp: { contains: '-70' } },
          { storageTemp: { contains: 'refriger' } },
          { storageTemp: { contains: 'frozen' } },
        ],
      },
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductLogistics[];
  }
}

