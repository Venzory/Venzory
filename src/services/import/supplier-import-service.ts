/**
 * Supplier Import Service (GS1 Foundation - Phase 1)
 * 
 * Handles importing supplier catalogs from various sources (CSV, API).
 * Orchestrates the full ingestion pipeline:
 * 1. Parse import data
 * 2. Validate and normalize
 * 3. Match to products (GTIN matching)
 * 4. Enrich with GS1 data
 * 5. Update supplier items
 */

import { ProductRepository } from '@/src/repositories/products';
import { GtinMatcherService, getGtinMatcherService } from '@/src/services/matching';
import { ProductEnrichmentService, getProductEnrichmentService } from '@/src/services/products';
import { getGdsnService } from '@/src/services/gdsn';
import { withTransaction } from '@/src/repositories/base';
import type { IntegrationType, MatchMethod } from '@prisma/client';
import logger from '@/lib/logger';

/**
 * Raw import row from CSV or API
 */
export interface ImportRow {
  supplierSku?: string;
  gtin?: string;
  name: string;
  brand?: string;
  description?: string;
  unitPrice?: number;
  currency?: string;
  minOrderQty?: number;
  stockLevel?: number;
  leadTimeDays?: number;
}

/**
 * Validated and normalized import item
 */
export interface NormalizedImportItem {
  original: ImportRow;
  normalized: {
    supplierSku: string | null;
    gtin: string | null;
    name: string;
    brand: string | null;
    description: string | null;
    unitPrice: number | null;
    currency: string;
    minOrderQty: number;
    stockLevel: number | null;
    leadTimeDays: number | null;
  };
  validationErrors: string[];
  validationWarnings: string[];
}

/**
 * Import result for a single item
 */
export interface ImportItemResult {
  rowIndex: number;
  success: boolean;
  productId: string | null;
  supplierItemId: string | null;
  matchMethod: MatchMethod | null;
  matchConfidence: number | null;
  needsReview: boolean;
  enriched: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Overall import result
 */
export interface ImportResult {
  importId: string;
  globalSupplierId: string;
  startedAt: Date;
  completedAt: Date;
  totalRows: number;
  successCount: number;
  failedCount: number;
  reviewCount: number;
  enrichedCount: number;
  items: ImportItemResult[];
}

/**
 * Import options
 */
export interface ImportOptions {
  /**
   * Integration type for created supplier items
   */
  integrationType?: IntegrationType;
  
  /**
   * Whether to automatically enrich products with GS1 data
   */
  autoEnrich?: boolean;
  
  /**
   * Minimum confidence for automatic matching (0.0 - 1.0)
   */
  minAutoMatchConfidence?: number;
  
  /**
   * Whether to create new products for unmatched GTINs
   */
  createNewProducts?: boolean;
  
  /**
   * Default currency if not specified in import
   */
  defaultCurrency?: string;
  
  /**
   * Whether to skip rows with validation errors
   */
  skipInvalidRows?: boolean;
}

const DEFAULT_OPTIONS: ImportOptions = {
  integrationType: 'CSV',
  autoEnrich: true,
  minAutoMatchConfidence: 0.90,
  createNewProducts: true,
  defaultCurrency: 'EUR',
  skipInvalidRows: true,
};

export class SupplierImportService {
  constructor(
    private productRepo: ProductRepository = new ProductRepository(),
    private gtinMatcher: GtinMatcherService = getGtinMatcherService(),
    private enrichmentService: ProductEnrichmentService = getProductEnrichmentService()
  ) {}
  
  /**
   * Import supplier catalog data
   */
  async importCatalog(
    globalSupplierId: string,
    rows: ImportRow[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const importId = `import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date();
    
    logger.info({
      module: 'SupplierImportService',
      operation: 'importCatalog',
      importId,
      globalSupplierId,
      rowCount: rows.length,
    }, 'Starting supplier catalog import');
    
    const results: ImportItemResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let reviewCount = 0;
    let enrichedCount = 0;
    
    // Phase 1: Normalize all rows
    const normalizedItems = this.normalizeRows(rows, opts);
    
    // Phase 2: Process each item
    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const result = await this.processImportItem(
        globalSupplierId,
        item,
        i,
        opts
      );
      
      results.push(result);
      
      if (result.success) {
        successCount++;
        if (result.enriched) {
          enrichedCount++;
        }
      } else {
        failedCount++;
      }
      
      if (result.needsReview) {
        reviewCount++;
      }
    }
    
    const completedAt = new Date();
    
    logger.info({
      module: 'SupplierImportService',
      operation: 'importCatalog',
      importId,
      globalSupplierId,
      totalRows: rows.length,
      successCount,
      failedCount,
      reviewCount,
      enrichedCount,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    }, 'Supplier catalog import completed');
    
    return {
      importId,
      globalSupplierId,
      startedAt,
      completedAt,
      totalRows: rows.length,
      successCount,
      failedCount,
      reviewCount,
      enrichedCount,
      items: results,
    };
  }
  
  /**
   * Normalize and validate import rows
   */
  private normalizeRows(
    rows: ImportRow[],
    options: ImportOptions
  ): NormalizedImportItem[] {
    return rows.map(row => this.normalizeRow(row, options));
  }
  
  /**
   * Normalize a single import row
   */
  private normalizeRow(
    row: ImportRow,
    options: ImportOptions
  ): NormalizedImportItem {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate required fields
    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }
    
    // Normalize GTIN
    let gtin: string | null = null;
    if (row.gtin) {
      const cleanGtin = row.gtin.replace(/[\s\-]/g, '').trim();
      if (cleanGtin && /^\d{8,14}$/.test(cleanGtin)) {
        gtin = cleanGtin;
      } else if (cleanGtin) {
        warnings.push(`Invalid GTIN format: ${row.gtin}`);
      }
    }
    
    // Normalize price
    let unitPrice: number | null = null;
    if (row.unitPrice !== undefined && row.unitPrice !== null) {
      const price = Number(row.unitPrice);
      if (!isNaN(price) && price >= 0) {
        unitPrice = Math.round(price * 100) / 100;
      } else {
        warnings.push(`Invalid price: ${row.unitPrice}`);
      }
    }
    
    // Normalize quantities
    let minOrderQty = 1;
    if (row.minOrderQty !== undefined && row.minOrderQty !== null) {
      const qty = Number(row.minOrderQty);
      if (!isNaN(qty) && qty > 0) {
        minOrderQty = Math.floor(qty);
      }
    }
    
    let stockLevel: number | null = null;
    if (row.stockLevel !== undefined && row.stockLevel !== null) {
      const stock = Number(row.stockLevel);
      if (!isNaN(stock) && stock >= 0) {
        stockLevel = Math.floor(stock);
      }
    }
    
    let leadTimeDays: number | null = null;
    if (row.leadTimeDays !== undefined && row.leadTimeDays !== null) {
      const days = Number(row.leadTimeDays);
      if (!isNaN(days) && days >= 0) {
        leadTimeDays = Math.floor(days);
      }
    }
    
    return {
      original: row,
      normalized: {
        supplierSku: row.supplierSku?.trim() || null,
        gtin,
        name: row.name?.trim() || '',
        brand: row.brand?.trim() || null,
        description: row.description?.trim() || null,
        unitPrice,
        currency: row.currency?.toUpperCase() || options.defaultCurrency || 'EUR',
        minOrderQty,
        stockLevel,
        leadTimeDays,
      },
      validationErrors: errors,
      validationWarnings: warnings,
    };
  }
  
  /**
   * Process a single import item
   */
  private async processImportItem(
    globalSupplierId: string,
    item: NormalizedImportItem,
    rowIndex: number,
    options: ImportOptions
  ): Promise<ImportItemResult> {
    const result: ImportItemResult = {
      rowIndex,
      success: false,
      productId: null,
      supplierItemId: null,
      matchMethod: null,
      matchConfidence: null,
      needsReview: false,
      enriched: false,
      errors: [...item.validationErrors],
      warnings: [...item.validationWarnings],
    };
    
    // Skip if validation errors and skipInvalidRows is true
    if (item.validationErrors.length > 0) {
      if (options.skipInvalidRows) {
        return result;
      }
    }
    
    try {
      // Step 1: Match to product
      const matchResult = await this.gtinMatcher.match({
        gtin: item.normalized.gtin,
        supplierSku: item.normalized.supplierSku,
        name: item.normalized.name,
        brand: item.normalized.brand,
        description: item.normalized.description,
      });
      
      result.matchMethod = matchResult.method;
      result.matchConfidence = matchResult.confidence;
      result.needsReview = matchResult.needsReview;
      
      let productId = matchResult.productId;
      
      // Step 2: Create product if needed
      if (!productId && options.createNewProducts) {
        if (item.normalized.gtin || item.normalized.name) {
          // First check if we can get GS1 data
          if (item.normalized.gtin && options.autoEnrich) {
            const gdsnService = getGdsnService();
            const lookupResult = await gdsnService.lookupByGtin(item.normalized.gtin);
            
            if (lookupResult.found && lookupResult.data) {
              // Create product with GS1 data
              const product = await this.productRepo.createProduct({
                gtin: item.normalized.gtin,
                brand: lookupResult.data.brandName || item.normalized.brand,
                name: lookupResult.data.tradeItemDescription || item.normalized.name,
                description: lookupResult.data.shortDescription || item.normalized.description,
                isGs1Product: true,
              });
              productId = product.id;
              result.enriched = true;
            }
          }
          
          // If still no product, create from supplier data
          if (!productId) {
            const product = await this.productRepo.createProduct({
              gtin: item.normalized.gtin,
              brand: item.normalized.brand,
              name: item.normalized.name,
              description: item.normalized.description,
              isGs1Product: !!item.normalized.gtin,
            });
            productId = product.id;
          }
          
          result.matchMethod = 'MANUAL';
          result.matchConfidence = item.normalized.gtin ? 0.8 : 0.5;
        }
      }
      
      result.productId = productId;
      
      // Step 3: Create/update supplier item
      if (productId) {
        const supplierItem = await this.productRepo.upsertSupplierItem({
          globalSupplierId,
          productId,
          supplierSku: item.normalized.supplierSku,
          supplierName: item.normalized.name,
          supplierDescription: item.normalized.description,
          unitPrice: item.normalized.unitPrice,
          currency: item.normalized.currency,
          minOrderQty: item.normalized.minOrderQty,
          stockLevel: item.normalized.stockLevel,
          leadTimeDays: item.normalized.leadTimeDays,
          integrationType: options.integrationType,
          isActive: true,
          // Match fields (Phase 5)
          matchMethod: result.matchMethod ?? 'MANUAL',
          matchConfidence: result.matchConfidence,
          matchedBy: 'system',
          needsReview: result.needsReview,
        });
        
        result.supplierItemId = supplierItem.id;
        result.success = true;
        
        // Step 4: Enrich if needed and not already done
        if (options.autoEnrich && !result.enriched && item.normalized.gtin) {
          try {
            const enrichResult = await this.enrichmentService.enrichFromGdsn(productId);
            result.enriched = enrichResult.success;
            if (enrichResult.warnings.length > 0) {
              result.warnings.push(...enrichResult.warnings);
            }
          } catch (error) {
            result.warnings.push('Failed to enrich with GS1 data');
          }
        }
      } else {
        result.errors.push('Could not match or create product');
        result.needsReview = true;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Processing error: ${errorMessage}`);
      
      logger.error({
        module: 'SupplierImportService',
        operation: 'processImportItem',
        rowIndex,
        error: errorMessage,
      }, 'Failed to process import item');
    }
    
    return result;
  }
  
  /**
   * Parse CSV content into import rows
   * 
   * Expected columns: sku, gtin, name, brand, description, price, currency, min_qty, stock, lead_time
   */
  parseCSV(csvContent: string): ImportRow[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }
    
    // Parse header
    const header = this.parseCSVLine(lines[0].toLowerCase());
    const columnMap = this.buildColumnMap(header);
    
    // Parse data rows
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      const row: ImportRow = {
        supplierSku: this.getColumn(values, columnMap, ['sku', 'supplier_sku', 'suppliersku', 'article', 'artikelnummer']),
        gtin: this.getColumn(values, columnMap, ['gtin', 'ean', 'barcode', 'upc']),
        name: this.getColumn(values, columnMap, ['name', 'product_name', 'productname', 'description', 'bezeichnung']) || '',
        brand: this.getColumn(values, columnMap, ['brand', 'merk', 'manufacturer', 'hersteller']),
        description: this.getColumn(values, columnMap, ['description', 'details', 'beschreibung', 'long_description']),
        unitPrice: this.getNumericColumn(values, columnMap, ['price', 'unit_price', 'unitprice', 'prijs', 'preis']),
        currency: this.getColumn(values, columnMap, ['currency', 'valuta', 'wahrung']),
        minOrderQty: this.getNumericColumn(values, columnMap, ['min_qty', 'minorderqty', 'minimum', 'min_order']),
        stockLevel: this.getNumericColumn(values, columnMap, ['stock', 'voorraad', 'bestand', 'inventory']),
        leadTimeDays: this.getNumericColumn(values, columnMap, ['lead_time', 'leadtime', 'delivery_days', 'liefertzeit']),
      };
      
      // Only add if row has at least name or GTIN
      if (row.name || row.gtin) {
        rows.push(row);
      }
    }
    
    return rows;
  }
  
  /**
   * Parse a single CSV line, handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }
  
  /**
   * Build column index map from header
   */
  private buildColumnMap(header: string[]): Map<string, number> {
    const map = new Map<string, number>();
    header.forEach((col, index) => {
      map.set(col.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), index);
    });
    return map;
  }
  
  /**
   * Get column value by possible names
   */
  private getColumn(
    values: string[],
    columnMap: Map<string, number>,
    possibleNames: string[]
  ): string | undefined {
    for (const name of possibleNames) {
      const index = columnMap.get(name);
      if (index !== undefined && values[index]) {
        return values[index];
      }
    }
    return undefined;
  }
  
  /**
   * Get numeric column value
   */
  private getNumericColumn(
    values: string[],
    columnMap: Map<string, number>,
    possibleNames: string[]
  ): number | undefined {
    const value = this.getColumn(values, columnMap, possibleNames);
    if (value) {
      const num = parseFloat(value.replace(',', '.').replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        return num;
      }
    }
    return undefined;
  }
}

// Singleton instance
let importServiceInstance: SupplierImportService | null = null;

export function getSupplierImportService(): SupplierImportService {
  if (!importServiceInstance) {
    importServiceInstance = new SupplierImportService();
  }
  return importServiceInstance;
}

