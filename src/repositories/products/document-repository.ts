/**
 * ProductDocument Repository (GS1 Foundation - Phase 1)
 * Handles data access for product documents (IFU, SDS, CE declarations, etc.)
 */

import { Prisma, DocumentType } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for documents
export interface ProductDocument {
  id: string;
  productId: string;
  type: DocumentType;
  title: string;
  language: string;
  url: string;
  filename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  version: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentInput {
  productId: string;
  type: DocumentType;
  title: string;
  language?: string;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  effectiveDate?: Date | null;
  expirationDate?: Date | null;
  version?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
}

export interface UpdateDocumentInput {
  type?: DocumentType;
  title?: string;
  language?: string;
  url?: string;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  effectiveDate?: Date | null;
  expirationDate?: Date | null;
  version?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
}

export interface DocumentFilters {
  productId?: string;
  type?: DocumentType;
  language?: string;
  isExpired?: boolean;
}

export class DocumentRepository extends BaseRepository {
  /**
   * Find all documents for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductDocument[]> {
    const client = this.getClient(options?.tx);

    const documents = await client.productDocument.findMany({
      where: { productId },
      orderBy: [
        { type: 'asc' },
        { language: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return documents as ProductDocument[];
  }

  /**
   * Find document by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductDocument | null> {
    const client = this.getClient(options?.tx);

    const document = await client.productDocument.findUnique({
      where: { id },
    });

    return document as ProductDocument | null;
  }

  /**
   * Find documents by type
   */
  async findByType(
    productId: string,
    type: DocumentType,
    options?: FindOptions
  ): Promise<ProductDocument[]> {
    const client = this.getClient(options?.tx);

    const documents = await client.productDocument.findMany({
      where: { productId, type },
      orderBy: [
        { language: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return documents as ProductDocument[];
  }

  /**
   * Find documents by type and language
   */
  async findByTypeAndLanguage(
    productId: string,
    type: DocumentType,
    language: string,
    options?: FindOptions
  ): Promise<ProductDocument | null> {
    const client = this.getClient(options?.tx);

    const document = await client.productDocument.findFirst({
      where: { productId, type, language },
      orderBy: { createdAt: 'desc' },
    });

    return document as ProductDocument | null;
  }

  /**
   * Find documents with filters
   */
  async findWithFilters(
    filters: DocumentFilters,
    options?: FindOptions
  ): Promise<ProductDocument[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductDocumentWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.language) {
      where.language = filters.language;
    }
    if (filters.isExpired !== undefined) {
      if (filters.isExpired) {
        where.expirationDate = { lt: new Date() };
      } else {
        where.OR = [
          { expirationDate: null },
          { expirationDate: { gte: new Date() } },
        ];
      }
    }

    const documents = await client.productDocument.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return documents as ProductDocument[];
  }

  /**
   * Create document
   */
  async create(
    input: CreateDocumentInput,
    options?: RepositoryOptions
  ): Promise<ProductDocument> {
    const client = this.getClient(options?.tx);

    const document = await client.productDocument.create({
      data: {
        productId: input.productId,
        type: input.type,
        title: input.title,
        language: input.language ?? 'en',
        url: input.url,
        filename: input.filename ?? null,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        effectiveDate: input.effectiveDate ?? null,
        expirationDate: input.expirationDate ?? null,
        version: input.version ?? null,
        storageProvider: input.storageProvider ?? 'local',
        storageKey: input.storageKey ?? null,
      },
    });

    return document as ProductDocument;
  }

  /**
   * Update document
   */
  async update(
    id: string,
    input: UpdateDocumentInput,
    options?: RepositoryOptions
  ): Promise<ProductDocument> {
    const client = this.getClient(options?.tx);

    const document = await client.productDocument.update({
      where: { id },
      data: {
        type: input.type,
        title: input.title,
        language: input.language,
        url: input.url,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        effectiveDate: input.effectiveDate,
        expirationDate: input.expirationDate,
        version: input.version,
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
      },
    });

    return document as ProductDocument;
  }

  /**
   * Delete document
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productDocument.delete({
      where: { id },
    });
  }

  /**
   * Delete all documents for a product
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const result = await client.productDocument.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Count documents for a product
   */
  async countByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.productDocument.count({
      where: { productId },
    });
  }

  /**
   * Count documents by type for a product
   */
  async countByType(
    productId: string,
    type: DocumentType,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.productDocument.count({
      where: { productId, type },
    });
  }

  /**
   * Find expiring documents (within N days)
   */
  async findExpiring(
    daysUntilExpiry: number = 30,
    options?: FindOptions
  ): Promise<ProductDocument[]> {
    const client = this.getClient(options?.tx);

    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + daysUntilExpiry);

    const documents = await client.productDocument.findMany({
      where: {
        expirationDate: {
          not: null,
          lte: expirationThreshold,
          gte: new Date(),
        },
      },
      orderBy: { expirationDate: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return documents as ProductDocument[];
  }
}

