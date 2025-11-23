import { GlobalProductRepository } from '@/src/repositories/products';
import { SupplierItemRepository } from '@/src/repositories/suppliers';
import { InventoryRepository } from '@/src/repositories/inventory';
import { Gs1Service, getGs1Service } from '@/src/services/gs1';
import { Item } from '@/src/domain/models';

export class ProductMatcherService {
  constructor(
    private gs1Service: Gs1Service,
    private globalProductRepo: GlobalProductRepository,
    private supplierItemRepo: SupplierItemRepository,
    private inventoryRepo: InventoryRepository
  ) {}

  /**
   * Ensure SupplierItem exists for a given supplier + GTIN (e.g. from import)
   */
  async ensureSupplierItemFromRow(
    globalSupplierId: string,
    row: { gtin: string; sku: string; price: number; currency: string }
  ): Promise<void> {
    // 1. Ensure Global Product
    const product = await this.gs1Service.ensureGlobalProductForGtin(row.gtin);

    // 2. Upsert Supplier Item (Global)
    await this.supplierItemRepo.upsertGlobalItem({
      globalSupplierId,
      productId: product.id,
      supplierSku: row.sku,
      unitPrice: row.price,
      currency: row.currency,
      integrationType: 'CSV',
      isActive: true
    });
  }

  /**
   * Create a Practice Item by auto-matching GTIN to Global Product
   */
  async createPracticeItemWithAutoMatch(
    practiceId: string,
    gtin: string,
    supplierItemId?: string
  ): Promise<Item> {
    // 1. Ensure Global Product
    const product = await this.gs1Service.ensureGlobalProductForGtin(gtin);

    // 2. Check if item exists
    const existingItems = await this.inventoryRepo.findItems(practiceId, { productId: product.id });
    if (existingItems.length > 0) {
      return existingItems[0];
    }

    // 3. Create Item
    // Note: InventoryRepository.createItem needs to support supplierItemId if we want to link it
    // For now we just create it linked to the product
    return this.inventoryRepo.createItem({
      practiceId,
      productId: product.id,
      name: product.name,
      supplierItemId: supplierItemId ?? null
    });
  }
}

// Singleton instance
let productMatcherServiceInstance: ProductMatcherService | null = null;

export function getProductMatcherService(): ProductMatcherService {
  if (!productMatcherServiceInstance) {
    productMatcherServiceInstance = new ProductMatcherService(
      getGs1Service(),
      new GlobalProductRepository(),
      new SupplierItemRepository(),
      new InventoryRepository()
    );
  }
  return productMatcherServiceInstance;
}
