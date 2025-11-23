import { GlobalProductRepository } from '@/src/repositories/products';
import { Product, Gs1LookupResult } from '@/src/domain/models';
import { Prisma } from '@prisma/client';

export class Gs1Service {
  constructor(private globalProductRepo: GlobalProductRepository) {}

  /**
   * Ensure a Global Product exists for the given GTIN.
   * If not found in DB, fetches from GS1 API (stub) and creates it.
   */
  async ensureGlobalProductForGtin(gtin: string): Promise<Product> {
    const existing = await this.globalProductRepo.findByGtin(gtin);
    if (existing) {
      return existing;
    }

    const gs1Data = await this.fetchFromApi(gtin);
    
    if (!gs1Data) {
       // Fallback: create placeholder
       return this.globalProductRepo.createFromGs1({
         gtin,
         name: `Product ${gtin}`,
         gs1VerificationStatus: 'UNVERIFIED'
       });
    }

    return this.globalProductRepo.createFromGs1({
      gtin: gs1Data.gtin,
      name: gs1Data.name,
      brand: gs1Data.brand,
      description: gs1Data.description,
      gs1VerificationStatus: gs1Data.verified ? 'VERIFIED' : 'UNVERIFIED',
      gs1Data: gs1Data.rawData as Record<string, any>
    });
  }

  // Stub function
  private async fetchFromApi(gtin: string): Promise<Gs1LookupResult | null> {
    // In future this calls real GS1 API
    // For now return null or mock data
    return null; 
  }
}

// Singleton instance
let gs1ServiceInstance: Gs1Service | null = null;

export function getGs1Service(): Gs1Service {
  if (!gs1ServiceInstance) {
    gs1ServiceInstance = new Gs1Service(new GlobalProductRepository());
  }
  return gs1ServiceInstance;
}
