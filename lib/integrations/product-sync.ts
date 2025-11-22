/**
 * Product Synchronization Service
 * 
 * ⚠️ SECURITY WARNING:
 * This module bypasses standard access control checks (isPlatformOwner).
 * It is intended for internal system processes (CLI, cron jobs) or 
 * rigorously checked API endpoints only.
 * 
 * CALLER RESPONSIBILITY:
 * Any code invoking these functions MUST ensure the caller is authorized
 * (e.g., checks isPlatformOwner() before calling).
 * 
 * Core logic for creating/updating Products and SupplierCatalogs.
 * This is the main entry point for all supplier data ingestion flows.
 * 
 * Key responsibilities:
 * - Find existing Products by GTIN or create new ones
 * - Link suppliers to products via SupplierCatalog
 * - Normalize supplier data from any format
 * - Trigger GS1 lookups when appropriate
 */

import { Prisma, IntegrationType } from '@prisma/client';
import { ProductRepository } from '@/src/repositories/products';
import { ProductData, CatalogEntry, SupplierDataFeed, ImportResult } from './types';
import { lookupGtin, isValidGtin, enrichProductWithGs1Data } from './gs1-lookup';
import logger from '@/lib/logger';
import type { CreateProductInput, UpsertSupplierCatalogInput } from '@/src/domain/models';

// Initialize repository instance
const productRepository = new ProductRepository();

/**
 * Find an existing Product by GTIN, or create a new one
 * 
 * This is the central function for product management:
 * - If GTIN provided and exists: return existing Product
 * - If GTIN provided and valid but doesn't exist: create new Product, attempt GS1 lookup
 * - If no GTIN: create non-GS1 Product
 * 
 * @param productData - Product information
 * @returns Product ID
 */
export async function findOrCreateProduct(productData: ProductData): Promise<string> {
  // If GTIN provided, try to find existing product
  if (productData.gtin && isValidGtin(productData.gtin)) {
    const existing = await productRepository.findProductByGtin(productData.gtin);
    
    if (existing) {
      return existing.id;
    }
    
    // Create new GS1 product and attempt lookup
    const createInput: CreateProductInput = {
      gtin: productData.gtin,
      brand: productData.brand,
      name: productData.name,
      description: productData.description,
      isGs1Product: true,
    };
    
    const product = await productRepository.createProduct(createInput);
    
    // Update GS1 data if provided
    if (productData.gs1VerificationStatus || productData.gs1Data) {
      await productRepository.updateProduct(product.id, {
        gs1VerificationStatus: productData.gs1VerificationStatus || 'UNVERIFIED',
        gs1Data: productData.gs1Data,
      });
    }
    
    // Attempt GS1 enrichment in background (don't wait)
    enrichProductWithGs1Data(product.id).catch(err => {
      logger.error({
        module: 'product-sync',
        operation: 'syncProductFromGlobal',
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      }, 'GS1 enrichment failed');
    });
    
    return product.id;
  }
  
  // No GTIN - create non-GS1 product
  const createInput: CreateProductInput = {
    gtin: null,
    brand: productData.brand,
    name: productData.name,
    description: productData.description,
    isGs1Product: false,
  };
  
  const product = await productRepository.createProduct(createInput);
  
  return product.id;
}

/**
 * Sync a supplier's catalog entry for a product
 * 
 * Creates or updates the SupplierCatalog entry that links a supplier to a product
 * with their specific pricing and integration settings.
 * 
 * @param practiceSupplierId - Practice Supplier ID
 * @param productId - Product ID
 * @param catalogData - Supplier-specific catalog information
 * @returns SupplierCatalog ID
 */
export async function syncSupplierCatalog(
  practiceSupplierId: string,
  productId: string,
  catalogData: CatalogEntry
): Promise<string> {
  const upsertInput: UpsertSupplierCatalogInput = {
    practiceSupplierId,
    productId,
    supplierSku: catalogData.supplierSku,
    unitPrice: catalogData.unitPrice,
    currency: catalogData.currency || 'EUR',
    minOrderQty: catalogData.minOrderQty || 1,
    integrationType: catalogData.integrationType,
    integrationConfig: catalogData.integrationConfig,
    isActive: catalogData.isActive ?? true,
  };
  
  const catalog = await productRepository.upsertSupplierCatalog(upsertInput);
  
  return catalog.id;
}

/**
 * Process a complete supplier data feed entry
 * 
 * This is the main entry point for ingesting supplier data:
 * 1. Find or create the canonical Product
 * 2. Create or update the SupplierCatalog entry
 * 
 * @param practiceSupplierId - Practice Supplier ID
 * @param feed - Supplier data feed entry
 * @returns Object with productId and catalogId
 */
export async function processSupplierFeed(
  practiceSupplierId: string,
  feed: SupplierDataFeed
): Promise<{ productId: string; catalogId: string }> {
  // Find or create the product
  const productId = await findOrCreateProduct(feed.product);
  
  // Sync the supplier catalog entry
  const catalogId = await syncSupplierCatalog(practiceSupplierId, productId, feed.catalog);
  
  return { productId, catalogId };
}

/**
 * Batch process multiple supplier data feed entries
 * 
 * Efficiently processes multiple products from a supplier
 * 
 * @param practiceSupplierId - Practice Supplier ID
 * @param feeds - Array of supplier data feed entries
 * @returns Import result summary
 */
export async function batchProcessSupplierFeeds(
  practiceSupplierId: string,
  feeds: SupplierDataFeed[]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [],
    products: [],
  };
  
  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];
    try {
      const { productId } = await processSupplierFeed(practiceSupplierId, feed);
      
      // Check if product was newly created or updated
      const product = await productRepository.findProductById(productId);
      
      if (product) {
        // Check if it was just created (within last second)
        const isNew = product.createdAt > new Date(Date.now() - 1000);
        if (isNew) {
          result.imported++;
        } else {
          result.updated++;
        }
        
        result.products.push({
          id: product.id,
          gtin: product.gtin ?? undefined,
          name: product.name,
        });
      }
    } catch (error: unknown) {
      result.failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        index: i,
        supplierSku: feed.catalog.supplierSku,
        gtin: feed.product.gtin,
        message,
        details: error,
      });
    }
  }
  
  result.success = result.failed === 0;
  return result;
}

/**
 * Normalize supplier data from various formats
 * 
 * Converts different supplier data formats into our standard SupplierDataFeed structure
 * 
 * @param rawData - Raw supplier data in any format
 * @param integrationType - The type of integration
 * @returns Normalized supplier data feed
 */
export function normalizeSupplierData(
  rawData: unknown,
  integrationType: IntegrationType
): SupplierDataFeed {
  // This is a basic implementation - extend based on actual supplier formats
  
  switch (integrationType) {
    case 'API':
      return normalizeApiData(rawData);
    
    case 'CSV':
      return normalizeCsvData(rawData);
    
    case 'EDI':
      return normalizeEdiData(rawData);
    
    case 'OCI':
      return normalizeOciData(rawData);
    
    case 'MANUAL':
    default:
      return normalizeManualData(rawData);
  }
}

/**
 * Normalize API response data
 */
function normalizeApiData(data: unknown): SupplierDataFeed {
  const record = data as Record<string, unknown>;
  return {
    product: {
      gtin: (record.gtin || record.ean || record.barcode) as string | undefined,
      brand: (record.brand || record.manufacturer) as string | undefined,
      name: (record.name || record.productName || record.title) as string,
      description: (record.description || record.longDescription) as string | undefined,
      isGs1Product: Boolean(record.gtin || record.ean),
    },
    catalog: {
      supplierSku: (record.sku || record.supplierSku || record.articleNumber) as string | undefined,
      unitPrice: parseFloat((record.price || record.unitPrice || 0) as string),
      currency: (record.currency || 'EUR') as string,
      minOrderQty: parseInt((record.minOrderQty || record.moq || '1') as string, 10),
      integrationType: 'API',
      isActive: record.active !== false,
    },
  };
}

/**
 * Normalize CSV row data
 */
function normalizeCsvData(data: unknown): SupplierDataFeed {
  const record = data as Record<string, unknown>;
  return {
    product: {
      gtin: (record.GTIN || record.EAN || record.Barcode || record.gtin) as string | undefined,
      brand: (record.Brand || record.Manufacturer || record.brand) as string | undefined,
      name: (record.Name || record.ProductName || record.Description || record.name) as string,
      description: (record.Description || record.LongDescription || record.description) as string | undefined,
      isGs1Product: Boolean(record.GTIN || record.EAN),
    },
    catalog: {
      supplierSku: (record.SKU || record.ArticleNumber || record.SupplierSKU || record.sku) as string | undefined,
      unitPrice: parseFloat((record.Price || record.UnitPrice || record.price || '0') as string),
      currency: (record.Currency || record.currency || 'EUR') as string,
      minOrderQty: parseInt((record.MinOrderQty || record.MOQ || record.minOrderQty || '1') as string, 10),
      integrationType: 'CSV',
      isActive: true,
    },
  };
}

/**
 * Normalize EDI data
 */
function normalizeEdiData(data: unknown): SupplierDataFeed {
  // EDI parsing would be more complex in production
  // This is a placeholder structure
  const record = data as Record<string, unknown>;
  return {
    product: {
      gtin: (record.ean || record.gtin) as string | undefined,
      brand: record.brand as string | undefined,
      name: record.description as string,
      description: record.longDescription as string | undefined,
      isGs1Product: Boolean(record.ean || record.gtin),
    },
    catalog: {
      supplierSku: record.lineItemId as string | undefined,
      unitPrice: parseFloat((record.unitPrice || '0') as string),
      currency: (record.currency || 'EUR') as string,
      minOrderQty: parseInt((record.minQty || '1') as string, 10),
      integrationType: 'EDI',
      isActive: true,
    },
  };
}

/**
 * Normalize OCI (Open Catalog Interface) data
 */
function normalizeOciData(data: unknown): SupplierDataFeed {
  const record = data as Record<string, unknown>;
  return {
    product: {
      gtin: record.NEW_ITEM_EAN as string | undefined,
      brand: record.NEW_ITEM_VENDOR as string | undefined,
      name: record.NEW_ITEM_DESCRIPTION as string,
      description: record.NEW_ITEM_LONGTEXT as string | undefined,
      isGs1Product: Boolean(record.NEW_ITEM_EAN),
    },
    catalog: {
      supplierSku: record.NEW_ITEM_VENDORMAT as string | undefined,
      unitPrice: parseFloat((record.NEW_ITEM_PRICE || '0') as string),
      currency: (record.NEW_ITEM_CURRENCY || 'EUR') as string,
      minOrderQty: parseInt((record.NEW_ITEM_MINQTY || '1') as string, 10),
      integrationType: 'OCI',
      isActive: true,
    },
  };
}

/**
 * Normalize manual entry data
 */
function normalizeManualData(data: unknown): SupplierDataFeed {
  const record = data as Record<string, unknown>;
  return {
    product: {
      gtin: record.gtin as string | undefined,
      brand: record.brand as string | undefined,
      name: record.name as string,
      description: record.description as string | undefined,
      isGs1Product: Boolean(record.gtin && isValidGtin(record.gtin as string)),
    },
    catalog: {
      supplierSku: (record.supplierSku || record.sku) as string | undefined,
      unitPrice: record.unitPrice ? parseFloat(record.unitPrice as string) : undefined,
      currency: (record.currency || 'EUR') as string,
      minOrderQty: record.minOrderQty ? parseInt(record.minOrderQty as string, 10) : 1,
      integrationType: 'MANUAL',
      isActive: true,
    },
  };
}

/**
 * Get or create a Product from item creation flow
 * 
 * Helper function for existing item creation flows in the app
 * This maintains backward compatibility while adding Product support
 * 
 * @param name - Item name
 * @param gtin - Optional GTIN
 * @param brand - Optional brand
 * @param description - Optional description
 * @returns Product ID
 */
export async function getOrCreateProductForItem(
  name: string,
  gtin?: string,
  brand?: string,
  description?: string
): Promise<string> {
  const productData: ProductData = {
    gtin: gtin,
    brand: brand,
    name: name,
    description: description,
    isGs1Product: Boolean(gtin && isValidGtin(gtin)),
  };
  
  return findOrCreateProduct(productData);
}

