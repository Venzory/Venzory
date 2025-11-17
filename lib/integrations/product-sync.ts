/**
 * Product Synchronization Service
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
 * @param supplierId - Supplier ID
 * @param productId - Product ID
 * @param catalogData - Supplier-specific catalog information
 * @returns SupplierCatalog ID
 */
export async function syncSupplierCatalog(
  supplierId: string,
  productId: string,
  catalogData: CatalogEntry
): Promise<string> {
  const upsertInput: UpsertSupplierCatalogInput = {
    supplierId,
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
 * @param supplierId - Supplier ID
 * @param feed - Supplier data feed entry
 * @returns Object with productId and catalogId
 */
export async function processSupplierFeed(
  supplierId: string,
  feed: SupplierDataFeed
): Promise<{ productId: string; catalogId: string }> {
  // Find or create the product
  const productId = await findOrCreateProduct(feed.product);
  
  // Sync the supplier catalog entry
  const catalogId = await syncSupplierCatalog(supplierId, productId, feed.catalog);
  
  return { productId, catalogId };
}

/**
 * Batch process multiple supplier data feed entries
 * 
 * Efficiently processes multiple products from a supplier
 * 
 * @param supplierId - Supplier ID
 * @param feeds - Array of supplier data feed entries
 * @returns Import result summary
 */
export async function batchProcessSupplierFeeds(
  supplierId: string,
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
      const { productId } = await processSupplierFeed(supplierId, feed);
      
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
  rawData: any,
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
function normalizeApiData(data: any): SupplierDataFeed {
  return {
    product: {
      gtin: data.gtin || data.ean || data.barcode,
      brand: data.brand || data.manufacturer,
      name: data.name || data.productName || data.title,
      description: data.description || data.longDescription,
      isGs1Product: Boolean(data.gtin || data.ean),
    },
    catalog: {
      supplierSku: data.sku || data.supplierSku || data.articleNumber,
      unitPrice: parseFloat(data.price || data.unitPrice || 0),
      currency: data.currency || 'EUR',
      minOrderQty: parseInt(data.minOrderQty || data.moq || '1', 10),
      integrationType: 'API',
      isActive: data.active !== false,
    },
  };
}

/**
 * Normalize CSV row data
 */
function normalizeCsvData(data: any): SupplierDataFeed {
  return {
    product: {
      gtin: data.GTIN || data.EAN || data.Barcode || data.gtin,
      brand: data.Brand || data.Manufacturer || data.brand,
      name: data.Name || data.ProductName || data.Description || data.name,
      description: data.Description || data.LongDescription || data.description,
      isGs1Product: Boolean(data.GTIN || data.EAN),
    },
    catalog: {
      supplierSku: data.SKU || data.ArticleNumber || data.SupplierSKU || data.sku,
      unitPrice: parseFloat(data.Price || data.UnitPrice || data.price || '0'),
      currency: data.Currency || data.currency || 'EUR',
      minOrderQty: parseInt(data.MinOrderQty || data.MOQ || data.minOrderQty || '1', 10),
      integrationType: 'CSV',
      isActive: true,
    },
  };
}

/**
 * Normalize EDI data
 */
function normalizeEdiData(data: any): SupplierDataFeed {
  // EDI parsing would be more complex in production
  // This is a placeholder structure
  return {
    product: {
      gtin: data.ean || data.gtin,
      brand: data.brand,
      name: data.description,
      description: data.longDescription,
      isGs1Product: Boolean(data.ean || data.gtin),
    },
    catalog: {
      supplierSku: data.lineItemId,
      unitPrice: parseFloat(data.unitPrice || '0'),
      currency: data.currency || 'EUR',
      minOrderQty: parseInt(data.minQty || '1', 10),
      integrationType: 'EDI',
      isActive: true,
    },
  };
}

/**
 * Normalize OCI (Open Catalog Interface) data
 */
function normalizeOciData(data: any): SupplierDataFeed {
  return {
    product: {
      gtin: data.NEW_ITEM_EAN,
      brand: data.NEW_ITEM_VENDOR,
      name: data.NEW_ITEM_DESCRIPTION,
      description: data.NEW_ITEM_LONGTEXT,
      isGs1Product: Boolean(data.NEW_ITEM_EAN),
    },
    catalog: {
      supplierSku: data.NEW_ITEM_VENDORMAT,
      unitPrice: parseFloat(data.NEW_ITEM_PRICE || '0'),
      currency: data.NEW_ITEM_CURRENCY || 'EUR',
      minOrderQty: parseInt(data.NEW_ITEM_MINQTY || '1', 10),
      integrationType: 'OCI',
      isActive: true,
    },
  };
}

/**
 * Normalize manual entry data
 */
function normalizeManualData(data: any): SupplierDataFeed {
  return {
    product: {
      gtin: data.gtin,
      brand: data.brand,
      name: data.name,
      description: data.description,
      isGs1Product: Boolean(data.gtin && isValidGtin(data.gtin)),
    },
    catalog: {
      supplierSku: data.supplierSku || data.sku,
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : undefined,
      currency: data.currency || 'EUR',
      minOrderQty: data.minOrderQty ? parseInt(data.minOrderQty, 10) : 1,
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

