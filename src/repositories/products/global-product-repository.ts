import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { Product, ProductSyncData } from '@/src/domain/models';

export class GlobalProductRepository extends BaseRepository {
  /**
   * Find product by GTIN
   */
  async findByGtin(gtin: string, options?: FindOptions): Promise<Product | null> {
    const client = this.getClient(options?.tx);
    const product = await client.product.findUnique({
      where: { gtin },
      include: options?.include,
    });
    return product as Product | null;
  }

  /**
   * Create product from GS1 data
   */
  async createFromGs1(data: ProductSyncData, options?: RepositoryOptions): Promise<Product> {
    const client = this.getClient(options?.tx);
    
    // Check if exists first to be safe
    if (data.gtin) {
      const existing = await this.findByGtin(data.gtin, options);
      if (existing) return existing;
    }

    const product = await client.product.create({
      data: {
        gtin: data.gtin ?? null,
        brand: data.brand ?? null,
        name: data.name,
        description: data.description ?? null,
        isGs1Product: true,
        gs1VerificationStatus: data.gs1VerificationStatus ?? 'VERIFIED',
        gs1Data: data.gs1Data as Prisma.InputJsonValue,
      },
    });

    return product as Product;
  }

  /**
   * Find product by ID
   */
  async findById(id: string, options?: FindOptions): Promise<Product | null> {
    const client = this.getClient(options?.tx);
    const product = await client.product.findUnique({
      where: { id },
      include: options?.include,
    });
    return product as Product | null;
  }
}

