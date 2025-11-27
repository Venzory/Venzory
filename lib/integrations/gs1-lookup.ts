/**
 * GS1 Lookup Service
 * 
 * Provides GS1 product data lookups via the GDSN service.
 * Currently uses a mock client for development; will connect to real
 * data pool providers (1WorldSync, Syndigo, GS1 GO) in production.
 */

import { Gs1VerificationStatus } from '@prisma/client';
import { Gs1LookupResponse, type JsonValue } from './types';
import { ProductRepository } from '@/src/repositories/products';
import { getGdsnService } from '@/src/services/gdsn';
import logger from '@/lib/logger';

// Initialize repository instance
const productRepository = new ProductRepository();

/**
 * Look up product information from GS1/GDSN registry
 * 
 * Uses the GDSN service which currently connects to mock client,
 * returning realistic sample data for testing.
 * 
 * @param gtin - Global Trade Item Number (barcode)
 * @returns GS1 product data if found, null if not found
 */
export async function lookupGtin(gtin: string): Promise<Gs1LookupResponse | null> {
  // Validate GTIN format (basic check - should be 8, 12, 13, or 14 digits)
  if (!isValidGtin(gtin)) {
    logger.warn({
      module: 'gs1-lookup',
      operation: 'lookupGtin',
      gtin,
    }, 'Invalid GTIN format');
    return null;
  }

  logger.debug({
    module: 'gs1-lookup',
    operation: 'lookupGtin',
    gtin,
  }, 'Looking up GTIN via GDSN service');
  
  try {
    const gdsnService = getGdsnService();
    const result = await gdsnService.lookupByGtin(gtin);
    
    if (!result.found || !result.data) {
      logger.info({
        module: 'gs1-lookup',
        operation: 'lookupGtin',
        gtin,
        found: false,
      }, 'GTIN not found in GDSN');
      return null;
    }
    
    const gdsnData = result.data;
    
    logger.info({
      module: 'gs1-lookup',
      operation: 'lookupGtin',
      gtin,
      found: true,
      brand: gdsnData.brandName,
    }, 'GTIN found in GDSN');
    
    // Map GDSN data to Gs1LookupResponse format
    // Convert null values to undefined to match the interface
    return {
      found: true,
      gtin: gdsnData.gtin,
      brand: gdsnData.brandName ?? undefined,
      name: gdsnData.tradeItemDescription,
      description: gdsnData.shortDescription ?? undefined,
      images: gdsnData.digitalAssets
        ?.filter(a => a.type === 'PRODUCT_IMAGE')
        .map(a => a.url) ?? [],
      netContent: gdsnData.netContentValue 
        ? `${gdsnData.netContentValue} ${gdsnData.netContentUom || ''}`.trim()
        : undefined,
      manufacturer: gdsnData.manufacturerName ?? undefined,
      verificationStatus: Gs1VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      rawData: gdsnData.raw as Record<string, JsonValue>,
    };
  } catch (error) {
    logger.error({
      module: 'gs1-lookup',
      operation: 'lookupGtin',
      gtin,
      error: error instanceof Error ? error.message : String(error),
    }, 'Error looking up GTIN');
    return null;
  }
}

/**
 * Update a Product's GS1 verification status
 * 
 * @param productId - Product ID to update
 * @param status - New verification status
 * @param gs1Data - Optional GS1 data to store
 */
export async function updateGs1Verification(
  productId: string,
  status: Gs1VerificationStatus,
  gs1Data?: Record<string, unknown>
): Promise<void> {
  await productRepository.updateGs1Verification(productId, status, gs1Data);
}

/**
 * Validate GTIN format
 * 
 * @param gtin - GTIN to validate
 * @returns true if valid format, false otherwise
 */
export function isValidGtin(gtin: string): boolean {
  // Remove any whitespace
  const cleaned = gtin.trim();
  
  // Check if it's all digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }
  
  // Check valid lengths (GTIN-8, GTIN-12, GTIN-13, GTIN-14)
  const validLengths = [8, 12, 13, 14];
  if (!validLengths.includes(cleaned.length)) {
    return false;
  }
  
  // TODO: Add check digit validation (GS1 algorithm)
  // For now, just validate format
  
  return true;
}

/**
 * Batch lookup multiple GTINs
 * 
 * PLACEHOLDER: In production, this would use batch API endpoints for efficiency
 * 
 * @param gtins - Array of GTINs to lookup
 * @returns Map of GTIN to lookup result
 */
export async function batchLookupGtins(
  gtins: string[]
): Promise<Map<string, Gs1LookupResponse | null>> {
  const results = new Map<string, Gs1LookupResponse | null>();
  
  // In production, use batch API endpoint
  // For now, just call individual lookups (which are placeholders anyway)
  for (const gtin of gtins) {
    const result = await lookupGtin(gtin);
    results.set(gtin, result);
  }
  
  return results;
}

/**
 * Enrich an existing Product with GS1 data
 * 
 * Looks up the product's GTIN in GS1 registry and updates the Product record
 * with verified information if found.
 * 
 * @param productId - Product ID to enrich
 * @returns true if enriched, false if no GS1 data found or no GTIN
 */
export async function enrichProductWithGs1Data(productId: string): Promise<boolean> {
  const product = await productRepository.findProductById(productId);
  
  if (!product || !product.gtin) {
    return false;
  }
  
  // Update status to PENDING while looking up
  await updateGs1Verification(productId, Gs1VerificationStatus.PENDING);
  
  try {
    const gs1Data = await lookupGtin(product.gtin);
    
    if (gs1Data && gs1Data.found) {
      // Update product with GS1 data
      await productRepository.updateProduct(productId, {
        brand: gs1Data.brand,
        name: gs1Data.name || product.gtin, // Fallback to GTIN if no name
        description: gs1Data.description,
        isGs1Product: true,
        gs1VerificationStatus: Gs1VerificationStatus.VERIFIED,
        gs1VerifiedAt: gs1Data.verifiedAt,
        gs1Data: gs1Data.rawData,
      });
      
      return true;
    } else {
      // No GS1 data found - mark as UNVERIFIED
      await updateGs1Verification(productId, Gs1VerificationStatus.UNVERIFIED);
      return false;
    }
  } catch (error) {
    // Lookup failed - mark as FAILED
    logger.error({
      module: 'gs1-lookup',
      operation: 'enrichProductWithGs1Data',
      productId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Error enriching product with GS1 data');
    await updateGs1Verification(productId, Gs1VerificationStatus.FAILED);
    return false;
  }
}

/**
 * Refresh GS1 verification for products that are expired or failed
 * 
 * This can be run periodically to re-verify products
 * 
 * @param limit - Maximum number of products to refresh
 */
export async function refreshExpiredVerifications(limit: number = 100): Promise<number> {
  const expiredProducts = await productRepository.findProductsForGs1Refresh(limit);
  
  let refreshed = 0;
  
  for (const product of expiredProducts) {
    const success = await enrichProductWithGs1Data(product.id);
    if (success) {
      refreshed++;
    }
  }
  
  return refreshed;
}

