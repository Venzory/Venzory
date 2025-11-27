/**
 * Quality Score Service (GS1 Foundation - Phase 1)
 * 
 * Calculates and manages data quality scores for products.
 * Helps identify products that need data enrichment.
 */

import { ProductRepository } from '@/src/repositories/products';
import {
  QualityRepository,
  MediaRepository,
  DocumentRepository,
  RegulatoryRepository,
  PackagingRepository,
  type ProductQualityScore,
} from '@/src/repositories/products';
import type { Product } from '@/src/domain/models';
import logger from '@/lib/logger';

export interface QualityScoreResult {
  productId: string;
  score: ProductQualityScore;
  changes: string[];
}

export interface QualityRules {
  /**
   * Required fields for basic data score
   */
  requiredBasicFields: string[];
  
  /**
   * Weight for each component (should sum to 1.0)
   */
  weights: {
    basicData: number;
    gs1Data: number;
    media: number;
    documents: number;
    regulatory: number;
    packaging: number;
  };
  
  /**
   * Minimum requirements for medical devices
   */
  medicalDeviceRequirements: {
    requireIfu: boolean;
    requireCeDeclaration: boolean;
    requireUdiDi: boolean;
  };
}

const DEFAULT_RULES: QualityRules = {
  requiredBasicFields: ['name', 'brand', 'description', 'gtin'],
  weights: {
    basicData: 0.20,
    gs1Data: 0.25,
    media: 0.15,
    documents: 0.15,
    regulatory: 0.15,
    packaging: 0.10,
  },
  medicalDeviceRequirements: {
    requireIfu: true,
    requireCeDeclaration: true,
    requireUdiDi: true,
  },
};

export class QualityScoreService {
  private rules: QualityRules;
  
  constructor(
    private productRepo: ProductRepository = new ProductRepository(),
    private qualityRepo: QualityRepository = new QualityRepository(),
    private mediaRepo: MediaRepository = new MediaRepository(),
    private documentRepo: DocumentRepository = new DocumentRepository(),
    private regulatoryRepo: RegulatoryRepository = new RegulatoryRepository(),
    private packagingRepo: PackagingRepository = new PackagingRepository(),
    rules: Partial<QualityRules> = {}
  ) {
    this.rules = { ...DEFAULT_RULES, ...rules };
  }
  
  /**
   * Calculate and update quality score for a product
   */
  async calculateScore(productId: string): Promise<QualityScoreResult> {
    logger.debug({
      module: 'QualityScoreService',
      operation: 'calculateScore',
      productId,
    }, 'Calculating quality score');
    
    const product = await this.productRepo.findProductById(productId);
    
    const [
      mediaCount,
      documentCount,
      regulatoryCount,
      packagingCount,
    ] = await Promise.all([
      this.mediaRepo.countByProductId(productId),
      this.documentRepo.countByProductId(productId),
      this.regulatoryRepo.countByProductId(productId),
      this.packagingRepo.findByProductId(productId).then(p => p.length),
    ]);
    
    // Calculate component scores
    const basicDataScore = this.calculateBasicDataScore(product);
    const gs1DataScore = this.calculateGs1DataScore(product);
    const mediaScore = this.calculateMediaScore(mediaCount);
    const documentScore = this.calculateDocumentScore(documentCount, product.isRegulatedDevice ?? false);
    const regulatoryScore = this.calculateRegulatoryScore(regulatoryCount, product.isRegulatedDevice ?? false);
    const packagingScore = this.calculatePackagingScore(packagingCount);
    
    // Calculate overall weighted score
    const overallScore = Math.round(
      basicDataScore * this.rules.weights.basicData +
      gs1DataScore * this.rules.weights.gs1Data +
      mediaScore * this.rules.weights.media +
      documentScore * this.rules.weights.documents +
      regulatoryScore * this.rules.weights.regulatory +
      packagingScore * this.rules.weights.packaging
    );
    
    // Identify missing fields
    const { missingFields, warnings } = this.identifyIssues(
      product,
      mediaCount,
      documentCount,
      regulatoryCount
    );
    
    // Upsert score
    const score = await this.qualityRepo.upsert(productId, {
      overallScore,
      basicDataScore,
      gs1DataScore,
      mediaScore,
      documentScore,
      regulatoryScore,
      packagingScore,
      missingFields,
      warnings,
    });
    
    logger.info({
      module: 'QualityScoreService',
      operation: 'calculateScore',
      productId,
      overallScore,
    }, 'Quality score calculated');
    
    return {
      productId,
      score,
      changes: [], // TODO: Track what changed
    };
  }
  
  /**
   * Calculate basic data score
   */
  private calculateBasicDataScore(product: Product): number {
    let score = 0;
    const maxScore = 100;
    const fieldWeight = maxScore / this.rules.requiredBasicFields.length;
    
    for (const field of this.rules.requiredBasicFields) {
      const value = (product as any)[field];
      if (value !== null && value !== undefined && value !== '') {
        score += fieldWeight;
      }
    }
    
    return Math.round(score);
  }
  
  /**
   * Calculate GS1 data score
   */
  private calculateGs1DataScore(product: Product): number {
    if (product.gs1VerificationStatus === 'VERIFIED') {
      return 100;
    }
    if (product.gs1VerificationStatus === 'PENDING') {
      return 50;
    }
    if (product.gtin && product.isGs1Product) {
      return 25;
    }
    if (product.gtin) {
      return 10;
    }
    return 0;
  }
  
  /**
   * Calculate media score
   */
  private calculateMediaScore(mediaCount: number): number {
    if (mediaCount >= 5) return 100;
    if (mediaCount >= 3) return 80;
    if (mediaCount >= 1) return 50;
    return 0;
  }
  
  /**
   * Calculate document score
   */
  private calculateDocumentScore(documentCount: number, isRegulatedDevice: boolean): number {
    if (isRegulatedDevice) {
      // Stricter requirements for medical devices
      if (documentCount >= 3) return 100;
      if (documentCount >= 2) return 70;
      if (documentCount >= 1) return 40;
      return 0;
    }
    
    // Standard products
    if (documentCount >= 2) return 100;
    if (documentCount >= 1) return 60;
    return 0;
  }
  
  /**
   * Calculate regulatory score
   */
  private calculateRegulatoryScore(regulatoryCount: number, isRegulatedDevice: boolean): number {
    if (!isRegulatedDevice) {
      // Non-regulated products get full score if they have any regulatory info
      return regulatoryCount > 0 ? 100 : 50;
    }
    
    // Medical devices require regulatory data
    if (regulatoryCount >= 2) return 100;
    if (regulatoryCount >= 1) return 60;
    return 0;
  }
  
  /**
   * Calculate packaging score
   */
  private calculatePackagingScore(packagingCount: number): number {
    if (packagingCount >= 3) return 100;
    if (packagingCount >= 2) return 70;
    if (packagingCount >= 1) return 40;
    return 0;
  }
  
  /**
   * Identify missing fields and warnings
   */
  private identifyIssues(
    product: Product,
    mediaCount: number,
    documentCount: number,
    regulatoryCount: number
  ): { missingFields: string[]; warnings: string[] } {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    
    // Check basic fields
    for (const field of this.rules.requiredBasicFields) {
      const value = (product as any)[field];
      if (value === null || value === undefined || value === '') {
        missingFields.push(field);
      }
    }
    
    // Check media
    if (mediaCount === 0) {
      missingFields.push('media');
    }
    
    // Medical device specific checks
    if (product.isRegulatedDevice) {
      if (documentCount === 0) {
        missingFields.push('documents');
        warnings.push('Medical device requires IFU and CE declaration');
      }
      if (regulatoryCount === 0) {
        missingFields.push('regulatory');
        warnings.push('Medical device requires regulatory compliance data');
      }
      if (!product.udiDi) {
        missingFields.push('udiDi');
        warnings.push('Medical device requires UDI-DI');
      }
    }
    
    // GS1 verification warnings
    if (product.gtin && product.gs1VerificationStatus !== 'VERIFIED') {
      warnings.push('Product has GTIN but is not GS1 verified');
    }
    
    return { missingFields, warnings };
  }
  
  /**
   * Batch calculate scores for multiple products
   */
  async batchCalculateScores(productIds: string[]): Promise<QualityScoreResult[]> {
    logger.info({
      module: 'QualityScoreService',
      operation: 'batchCalculateScores',
      count: productIds.length,
    }, 'Starting batch quality score calculation');
    
    const results: QualityScoreResult[] = [];
    
    for (const productId of productIds) {
      try {
        const result = await this.calculateScore(productId);
        results.push(result);
      } catch (error) {
        logger.error({
          module: 'QualityScoreService',
          operation: 'batchCalculateScores',
          productId,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to calculate score for product');
      }
    }
    
    return results;
  }
  
  /**
   * Get quality score for a product
   */
  async getScore(productId: string): Promise<ProductQualityScore | null> {
    return this.qualityRepo.findByProductId(productId);
  }
  
  /**
   * Find low-quality products
   */
  async findLowQualityProducts(threshold: number = 50, limit: number = 100): Promise<ProductQualityScore[]> {
    return this.qualityRepo.findLowQuality(threshold, { pagination: { limit } });
  }
  
  /**
   * Find products needing attention
   */
  async findProductsNeedingAttention(limit: number = 100): Promise<ProductQualityScore[]> {
    return this.qualityRepo.findNeedingAttention({ pagination: { limit } });
  }
  
  /**
   * Get quality statistics
   */
  async getStatistics(): Promise<{
    total: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    lowQualityCount: number;
    highQualityCount: number;
  }> {
    return this.qualityRepo.getStatistics();
  }
}

// Singleton instance
let qualityServiceInstance: QualityScoreService | null = null;

export function getQualityScoreService(): QualityScoreService {
  if (!qualityServiceInstance) {
    qualityServiceInstance = new QualityScoreService();
  }
  return qualityServiceInstance;
}

