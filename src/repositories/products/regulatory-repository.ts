/**
 * ProductRegulatory Repository (GS1 Foundation - Phase 1)
 * Handles data access for product regulatory compliance data
 */

import { Prisma, RegulatoryAuthority, ComplianceStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for regulatory data
export interface ProductRegulatory {
  id: string;
  productId: string;
  authority: RegulatoryAuthority;
  region: string | null;
  status: ComplianceStatus;
  certificateNumber: string | null;
  registrationId: string | null;
  udiDi: string | null;
  udiPi: string | null;
  issuingAgency: string | null;
  issuedDate: Date | null;
  expirationDate: Date | null;
  notifiedBodyId: string | null;
  notifiedBodyName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRegulatoryInput {
  productId: string;
  authority: RegulatoryAuthority;
  region?: string | null;
  status?: ComplianceStatus;
  certificateNumber?: string | null;
  registrationId?: string | null;
  udiDi?: string | null;
  udiPi?: string | null;
  issuingAgency?: string | null;
  issuedDate?: Date | null;
  expirationDate?: Date | null;
  notifiedBodyId?: string | null;
  notifiedBodyName?: string | null;
}

export interface UpdateRegulatoryInput {
  authority?: RegulatoryAuthority;
  region?: string | null;
  status?: ComplianceStatus;
  certificateNumber?: string | null;
  registrationId?: string | null;
  udiDi?: string | null;
  udiPi?: string | null;
  issuingAgency?: string | null;
  issuedDate?: Date | null;
  expirationDate?: Date | null;
  notifiedBodyId?: string | null;
  notifiedBodyName?: string | null;
}

export interface RegulatoryFilters {
  productId?: string;
  authority?: RegulatoryAuthority;
  status?: ComplianceStatus;
  isExpired?: boolean;
}

export class RegulatoryRepository extends BaseRepository {
  /**
   * Find all regulatory records for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductRegulatory[]> {
    const client = this.getClient(options?.tx);

    const records = await client.productRegulatory.findMany({
      where: { productId },
      orderBy: [
        { authority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return records as ProductRegulatory[];
  }

  /**
   * Find regulatory record by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductRegulatory | null> {
    const client = this.getClient(options?.tx);

    const record = await client.productRegulatory.findUnique({
      where: { id },
    });

    return record as ProductRegulatory | null;
  }

  /**
   * Find regulatory record by authority
   */
  async findByAuthority(
    productId: string,
    authority: RegulatoryAuthority,
    options?: FindOptions
  ): Promise<ProductRegulatory | null> {
    const client = this.getClient(options?.tx);

    const record = await client.productRegulatory.findFirst({
      where: { productId, authority },
      orderBy: { createdAt: 'desc' },
    });

    return record as ProductRegulatory | null;
  }

  /**
   * Find regulatory record by UDI-DI
   */
  async findByUdiDi(
    udiDi: string,
    options?: FindOptions
  ): Promise<ProductRegulatory | null> {
    const client = this.getClient(options?.tx);

    const record = await client.productRegulatory.findFirst({
      where: { udiDi },
    });

    return record as ProductRegulatory | null;
  }

  /**
   * Find regulatory records with filters
   */
  async findWithFilters(
    filters: RegulatoryFilters,
    options?: FindOptions
  ): Promise<ProductRegulatory[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductRegulatoryWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.authority) {
      where.authority = filters.authority;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.isExpired !== undefined) {
      if (filters.isExpired) {
        where.OR = [
          { status: 'EXPIRED' },
          { expirationDate: { lt: new Date() } },
        ];
      } else {
        where.AND = [
          { status: { not: 'EXPIRED' } },
          {
            OR: [
              { expirationDate: null },
              { expirationDate: { gte: new Date() } },
            ],
          },
        ];
      }
    }

    const records = await client.productRegulatory.findMany({
      where,
      orderBy: [
        { authority: 'asc' },
        { createdAt: 'desc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductRegulatory[];
  }

  /**
   * Create regulatory record
   */
  async create(
    input: CreateRegulatoryInput,
    options?: RepositoryOptions
  ): Promise<ProductRegulatory> {
    const client = this.getClient(options?.tx);

    const record = await client.productRegulatory.create({
      data: {
        productId: input.productId,
        authority: input.authority,
        region: input.region ?? null,
        status: input.status ?? 'UNKNOWN',
        certificateNumber: input.certificateNumber ?? null,
        registrationId: input.registrationId ?? null,
        udiDi: input.udiDi ?? null,
        udiPi: input.udiPi ?? null,
        issuingAgency: input.issuingAgency ?? null,
        issuedDate: input.issuedDate ?? null,
        expirationDate: input.expirationDate ?? null,
        notifiedBodyId: input.notifiedBodyId ?? null,
        notifiedBodyName: input.notifiedBodyName ?? null,
      },
    });

    return record as ProductRegulatory;
  }

  /**
   * Update regulatory record
   */
  async update(
    id: string,
    input: UpdateRegulatoryInput,
    options?: RepositoryOptions
  ): Promise<ProductRegulatory> {
    const client = this.getClient(options?.tx);

    const record = await client.productRegulatory.update({
      where: { id },
      data: {
        authority: input.authority,
        region: input.region,
        status: input.status,
        certificateNumber: input.certificateNumber,
        registrationId: input.registrationId,
        udiDi: input.udiDi,
        udiPi: input.udiPi,
        issuingAgency: input.issuingAgency,
        issuedDate: input.issuedDate,
        expirationDate: input.expirationDate,
        notifiedBodyId: input.notifiedBodyId,
        notifiedBodyName: input.notifiedBodyName,
      },
    });

    return record as ProductRegulatory;
  }

  /**
   * Upsert regulatory record by product + authority
   */
  async upsertByProductAuthority(
    productId: string,
    authority: RegulatoryAuthority,
    input: Omit<CreateRegulatoryInput, 'productId' | 'authority'>,
    options?: RepositoryOptions
  ): Promise<ProductRegulatory> {
    const client = this.getClient(options?.tx);

    const existing = await this.findByAuthority(productId, authority, options);

    if (existing) {
      return this.update(existing.id, { ...input, authority }, options);
    }

    return this.create({ ...input, productId, authority }, options);
  }

  /**
   * Delete regulatory record
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productRegulatory.delete({
      where: { id },
    });
  }

  /**
   * Delete all regulatory records for a product
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const result = await client.productRegulatory.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Count regulatory records for a product
   */
  async countByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.productRegulatory.count({
      where: { productId },
    });
  }

  /**
   * Find expiring certifications (within N days)
   */
  async findExpiring(
    daysUntilExpiry: number = 90,
    options?: FindOptions
  ): Promise<ProductRegulatory[]> {
    const client = this.getClient(options?.tx);

    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + daysUntilExpiry);

    const records = await client.productRegulatory.findMany({
      where: {
        expirationDate: {
          not: null,
          lte: expirationThreshold,
          gte: new Date(),
        },
        status: { not: 'EXPIRED' },
      },
      orderBy: { expirationDate: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductRegulatory[];
  }

  /**
   * Find products with compliance issues
   */
  async findNonCompliant(
    options?: FindOptions
  ): Promise<ProductRegulatory[]> {
    const client = this.getClient(options?.tx);

    const records = await client.productRegulatory.findMany({
      where: {
        status: {
          in: ['NON_COMPLIANT', 'EXPIRED', 'UNKNOWN'],
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return records as ProductRegulatory[];
  }
}

