/**
 * Integration Pipeline - Main Entry Point
 * 
 * This module exports all integration-related functionality for supplier data ingestion.
 * It provides a clean interface for the rest of the application to interact with
 * the GS1 foundation and supplier catalog management.
 * 
 * Usage examples:
 * 
 * ```typescript
 * // Create an item with automatic product creation
 * import { getOrCreateProductForItem } from '@/lib/integrations';
 * const productId = await getOrCreateProductForItem('Bandages', '1234567890123');
 * 
 * // Process a supplier feed
 * import { processSupplierFeed } from '@/lib/integrations';
 * await processSupplierFeed(supplierId, { product: {...}, catalog: {...} });
 * 
 * // Lookup a GTIN
 * import { lookupGtin } from '@/lib/integrations';
 * const gs1Data = await lookupGtin('1234567890123');
 * ```
 */

// Export types
export type {
  ProductData,
  CatalogEntry,
  IntegrationConfig,
  SupplierDataFeed,
  ImportResult,
  ImportError,
  Gs1LookupResponse,
  SupplierFeedParser,
} from './types';

// Export GS1 lookup functions
export {
  lookupGtin,
  isValidGtin,
  updateGs1Verification,
  batchLookupGtins,
  enrichProductWithGs1Data,
  refreshExpiredVerifications,
} from './gs1-lookup';

// Export product sync functions
export {
  findOrCreateProduct,
  syncSupplierCatalog,
  processSupplierFeed,
  batchProcessSupplierFeeds,
  normalizeSupplierData,
  getOrCreateProductForItem,
} from './product-sync';

