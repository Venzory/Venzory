/**
 * GTIN Matcher Service (GS1 Foundation - Phase 1)
 * 
 * Multi-stage matching pipeline for resolving supplier items to products.
 * 
 * Matching Stages:
 * 1. Exact GTIN - Direct match against Product.gtin
 * 2. GTIN Variants - Check GTIN-8/12/13/14 conversions
 * 3. Supplier Mapping - Use supplier-provided GTIN mappings
 * 4. Fuzzy/AI - (Phase 5) Semantic matching by name/brand
 * 5. Manual Review - Queue for human review
 */

import { ProductRepository } from '@/src/repositories/products';
import type { MatchMethod } from '@prisma/client';
import logger from '@/lib/logger';

export interface MatchInput {
  gtin?: string | null;
  supplierSku?: string | null;
  name: string;
  brand?: string | null;
  description?: string | null;
  manufacturerName?: string | null;
}

export interface MatchResult {
  productId: string | null;
  gtin: string | null;
  method: MatchMethod;
  confidence: number; // 0.0 - 1.0
  needsReview: boolean;
  matchedProduct?: {
    id: string;
    name: string;
    brand: string | null;
    gtin: string | null;
  };
  candidateProducts?: Array<{
    id: string;
    name: string;
    brand: string | null;
    gtin: string | null;
    score: number;
  }>;
}

export interface MatchOptions {
  /**
   * Include fuzzy/AI matching (requires Phase 5)
   */
  enableFuzzyMatching?: boolean;
  
  /**
   * Minimum confidence for automatic match (0.0 - 1.0)
   */
  minAutoMatchConfidence?: number;
  
  /**
   * Maximum candidates to return for manual review
   */
  maxCandidates?: number;
}

const DEFAULT_OPTIONS: MatchOptions = {
  enableFuzzyMatching: false, // Disabled until Phase 5
  minAutoMatchConfidence: 0.90,
  maxCandidates: 5,
};

export class GtinMatcherService {
  constructor(
    private productRepo: ProductRepository = new ProductRepository()
  ) {}
  
  /**
   * Match a supplier item to a product
   */
  async match(input: MatchInput, options: MatchOptions = {}): Promise<MatchResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    logger.debug({
      module: 'GtinMatcherService',
      operation: 'match',
      input: { gtin: input.gtin, name: input.name, brand: input.brand },
    }, 'Starting GTIN match');
    
    // Stage 1: Exact GTIN
    if (input.gtin) {
      const stage1Result = await this.matchExactGtin(input.gtin);
      if (stage1Result) {
        return stage1Result;
      }
    }
    
    // Stage 2: GTIN Variants
    if (input.gtin) {
      const stage2Result = await this.matchGtinVariants(input.gtin);
      if (stage2Result) {
        return stage2Result;
      }
    }
    
    // Stage 3: Supplier Mapping
    // TODO (Phase 3): Check if supplier has provided a mapping for this SKU
    
    // Stage 4: Fuzzy/AI Matching
    if (opts.enableFuzzyMatching) {
      const stage4Result = await this.matchFuzzy(input, opts);
      if (stage4Result && stage4Result.confidence >= opts.minAutoMatchConfidence!) {
        return stage4Result;
      }
      
      // If fuzzy found candidates but below threshold, return for review
      if (stage4Result) {
        return {
          ...stage4Result,
          needsReview: true,
        };
      }
    }
    
    // Stage 5: No match - needs manual review
    logger.info({
      module: 'GtinMatcherService',
      operation: 'match',
      input: { gtin: input.gtin, name: input.name },
      result: 'no_match',
    }, 'No automatic match found');
    
    return {
      productId: null,
      gtin: null,
      method: 'MANUAL',
      confidence: 0,
      needsReview: true,
    };
  }
  
  /**
   * Stage 1: Exact GTIN match
   */
  private async matchExactGtin(gtin: string): Promise<MatchResult | null> {
    const cleanGtin = this.cleanGtin(gtin);
    if (!this.isValidGtin(cleanGtin)) {
      return null;
    }
    
    const product = await this.productRepo.findProductByGtin(cleanGtin);
    
    if (product) {
      logger.info({
        module: 'GtinMatcherService',
        operation: 'matchExactGtin',
        gtin: cleanGtin,
        productId: product.id,
      }, 'Exact GTIN match found');
      
      return {
        productId: product.id,
        gtin: cleanGtin,
        method: 'EXACT_GTIN',
        confidence: 1.0,
        needsReview: false,
        matchedProduct: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          gtin: product.gtin,
        },
      };
    }
    
    return null;
  }
  
  /**
   * Stage 2: GTIN variant matching
   * Handles different GTIN formats (GTIN-8, GTIN-12, GTIN-13, GTIN-14)
   */
  private async matchGtinVariants(gtin: string): Promise<MatchResult | null> {
    const variants = this.generateGtinVariants(gtin);
    
    for (const variant of variants) {
      const product = await this.productRepo.findProductByGtin(variant);
      
      if (product) {
        logger.info({
          module: 'GtinMatcherService',
          operation: 'matchGtinVariants',
          originalGtin: gtin,
          matchedGtin: variant,
          productId: product.id,
        }, 'GTIN variant match found');
        
        return {
          productId: product.id,
          gtin: variant,
          method: 'EXACT_GTIN',
          confidence: 0.99,
          needsReview: false,
          matchedProduct: {
            id: product.id,
            name: product.name,
            brand: product.brand,
            gtin: product.gtin,
          },
        };
      }
    }
    
    return null;
  }
  
  /**
   * Stage 4: Fuzzy/AI matching
   * 
   * TODO (Phase 5): Implement semantic matching using embeddings or ML
   */
  private async matchFuzzy(
    input: MatchInput,
    options: MatchOptions
  ): Promise<MatchResult | null> {
    // Phase 1: Stub implementation
    // Phase 5 will implement proper semantic matching
    
    logger.debug({
      module: 'GtinMatcherService',
      operation: 'matchFuzzy',
      input: { name: input.name, brand: input.brand },
    }, 'Fuzzy matching not implemented (Phase 5)');
    
    // For now, try a simple name search
    const products = await this.productRepo.findProducts({
      search: input.name,
    }, { pagination: { limit: options.maxCandidates } });
    
    if (products.length === 0) {
      return null;
    }
    
    // Return candidates for review (no automatic matching in Phase 1)
    return {
      productId: null,
      gtin: null,
      method: 'FUZZY_NAME',
      confidence: 0.5, // Low confidence - needs review
      needsReview: true,
      candidateProducts: products.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        gtin: p.gtin,
        score: 0.5, // TODO: Calculate actual similarity score
      })),
    };
  }
  
  /**
   * Batch match multiple items
   */
  async batchMatch(
    items: MatchInput[],
    options: MatchOptions = {}
  ): Promise<Map<number, MatchResult>> {
    const results = new Map<number, MatchResult>();
    
    for (let i = 0; i < items.length; i++) {
      const result = await this.match(items[i], options);
      results.set(i, result);
    }
    
    return results;
  }
  
  /**
   * Clean GTIN - remove spaces, dashes, and leading zeros if needed
   */
  private cleanGtin(gtin: string): string {
    return gtin.replace(/[\s\-]/g, '').trim();
  }
  
  /**
   * Validate GTIN format (8, 12, 13, or 14 digits)
   */
  private isValidGtin(gtin: string): boolean {
    if (!/^\d+$/.test(gtin)) {
      return false;
    }
    
    const validLengths = [8, 12, 13, 14];
    return validLengths.includes(gtin.length);
  }
  
  /**
   * Generate GTIN variants (different formats)
   */
  private generateGtinVariants(gtin: string): string[] {
    const clean = this.cleanGtin(gtin);
    const variants: string[] = [];
    
    // Remove leading zeros
    const noLeadingZeros = clean.replace(/^0+/, '');
    if (noLeadingZeros !== clean && noLeadingZeros.length >= 8) {
      variants.push(noLeadingZeros);
    }
    
    // Pad to different lengths
    if (clean.length < 13) {
      const gtin13 = clean.padStart(13, '0');
      variants.push(gtin13);
    }
    
    if (clean.length < 14) {
      const gtin14 = clean.padStart(14, '0');
      variants.push(gtin14);
    }
    
    // For GTIN-13, try removing indicator digit to get GTIN-12
    if (clean.length === 13 && clean.startsWith('0')) {
      variants.push(clean.substring(1));
    }
    
    return variants;
  }
  
  /**
   * Validate GTIN check digit
   * 
   * TODO: Implement proper GS1 check digit validation
   */
  validateCheckDigit(gtin: string): boolean {
    const clean = this.cleanGtin(gtin);
    
    if (!this.isValidGtin(clean)) {
      return false;
    }
    
    // GS1 check digit algorithm
    const digits = clean.split('').map(Number);
    const checkDigit = digits.pop()!;
    
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      const multiplier = (digits.length - i) % 2 === 0 ? 1 : 3;
      sum += digits[i] * multiplier;
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheck;
  }
}

// Singleton instance
let gtinMatcherInstance: GtinMatcherService | null = null;

export function getGtinMatcherService(): GtinMatcherService {
  if (!gtinMatcherInstance) {
    gtinMatcherInstance = new GtinMatcherService();
  }
  return gtinMatcherInstance;
}

