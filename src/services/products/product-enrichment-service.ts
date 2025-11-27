/**
 * Product Enrichment Service (GS1 Foundation - Phase 1)
 * 
 * Handles enriching products with GS1/GDSN data.
 * Phase 1: Service skeleton with mock GDSN client
 * Phase 2+: Real GDSN integration and full enrichment pipeline
 */

import { ProductRepository } from '@/src/repositories/products';
import {
  PackagingRepository,
  MediaRepository,
  DocumentRepository,
  RegulatoryRepository,
  LogisticsRepository,
  QualityRepository,
} from '@/src/repositories/products';
import { GdsnService, getGdsnService, type GdsnProductData } from '@/src/services/gdsn';
import { withTransaction } from '@/src/repositories/base';
import logger from '@/lib/logger';

export interface EnrichmentResult {
  success: boolean;
  productId: string;
  gtin: string | null;
  enrichedFields: string[];
  errors: string[];
  warnings: string[];
}

export class ProductEnrichmentService {
  constructor(
    private gdsnService: GdsnService = getGdsnService(),
    private productRepo: ProductRepository = new ProductRepository(),
    private packagingRepo: PackagingRepository = new PackagingRepository(),
    private mediaRepo: MediaRepository = new MediaRepository(),
    private documentRepo: DocumentRepository = new DocumentRepository(),
    private regulatoryRepo: RegulatoryRepository = new RegulatoryRepository(),
    private logisticsRepo: LogisticsRepository = new LogisticsRepository(),
    private qualityRepo: QualityRepository = new QualityRepository()
  ) {}
  
  /**
   * Enrich a product with GS1/GDSN data
   * 
   * @param productId - The product ID to enrich
   * @returns EnrichmentResult with details of what was enriched
   */
  async enrichFromGdsn(productId: string): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      success: false,
      productId,
      gtin: null,
      enrichedFields: [],
      errors: [],
      warnings: [],
    };
    
    logger.info({
      module: 'ProductEnrichmentService',
      operation: 'enrichFromGdsn',
      productId,
    }, 'Starting product enrichment from GDSN');
    
    try {
      // 1. Get product
      const product = await this.productRepo.findProductById(productId);
      if (!product) {
        result.errors.push('Product not found');
        return result;
      }
      
      result.gtin = product.gtin ?? null;
      
      // 2. Check if product has GTIN
      if (!product.gtin) {
        result.warnings.push('Product has no GTIN - cannot enrich from GDSN');
        return result;
      }
      
      // 3. Lookup in GDSN
      const gdsnResult = await this.gdsnService.lookupByGtin(product.gtin);
      
      if (!gdsnResult.found || !gdsnResult.data) {
        result.warnings.push('Product not found in GDSN');
        
        // Update status to indicate we tried but found nothing
        await this.productRepo.updateGs1Verification(productId, 'UNVERIFIED');
        
        return result;
      }
      
      // 4. Enrich product data in transaction
      await withTransaction(async (tx) => {
        const gdsnData = gdsnResult.data!;
        
        // 4a. Update core product fields
        const enrichedCore = await this.enrichCoreProduct(productId, gdsnData, { tx });
        result.enrichedFields.push(...enrichedCore);
        
        // 4b. Process packaging hierarchy
        // TODO (Phase 4): Implement packaging enrichment
        if (gdsnData.packagingHierarchy?.length > 0) {
          result.warnings.push('Packaging hierarchy available but not processed (Phase 4)');
        }
        
        // 4c. Process media
        // TODO (Phase 4): Implement media download and storage
        if (gdsnData.digitalAssets?.length > 0) {
          result.warnings.push(`${gdsnData.digitalAssets.length} media assets available but not downloaded (Phase 4)`);
        }
        
        // 4d. Process documents
        // TODO (Phase 4): Implement document download and storage
        if (gdsnData.referencedDocuments?.length > 0) {
          result.warnings.push(`${gdsnData.referencedDocuments.length} documents available but not downloaded (Phase 4)`);
        }
        
        // 4e. Process regulatory info
        if (gdsnData.regulatoryInfo) {
          await this.enrichRegulatory(productId, gdsnData.regulatoryInfo, { tx });
          result.enrichedFields.push('regulatory');
        }
        
        // 4f. Process logistics
        if (gdsnData.logisticsInfo) {
          await this.enrichLogistics(productId, gdsnData.logisticsInfo, { tx });
          result.enrichedFields.push('logistics');
        }
        
        // 4g. Update verification status
        await this.productRepo.updateGs1Verification(
          productId,
          'VERIFIED',
          gdsnData.raw as Record<string, unknown>,
          { tx }
        );
        result.enrichedFields.push('gs1VerificationStatus');
        
        // 4h. Recalculate quality score
        // TODO (Phase 5): Implement proper quality scoring
        await this.updateQualityScore(productId, { tx });
        result.enrichedFields.push('qualityScore');
      });
      
      result.success = true;
      
      logger.info({
        module: 'ProductEnrichmentService',
        operation: 'enrichFromGdsn',
        productId,
        enrichedFields: result.enrichedFields.length,
      }, 'Product enrichment completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Enrichment failed: ${errorMessage}`);
      
      logger.error({
        module: 'ProductEnrichmentService',
        operation: 'enrichFromGdsn',
        productId,
        error: errorMessage,
      }, 'Product enrichment failed');
    }
    
    return result;
  }
  
  /**
   * Enrich core product fields from GDSN data
   */
  private async enrichCoreProduct(
    productId: string,
    gdsnData: GdsnProductData,
    options: { tx?: any }
  ): Promise<string[]> {
    const enrichedFields: string[] = [];
    
    const updateData: Record<string, any> = {};
    
    // Update fields if GDSN has data
    if (gdsnData.tradeItemDescription) {
      updateData.name = gdsnData.tradeItemDescription;
      enrichedFields.push('name');
    }
    if (gdsnData.brandName) {
      updateData.brand = gdsnData.brandName;
      enrichedFields.push('brand');
    }
    if (gdsnData.shortDescription) {
      updateData.shortDescription = gdsnData.shortDescription;
      enrichedFields.push('shortDescription');
    }
    if (gdsnData.manufacturerGln) {
      updateData.manufacturerGln = gdsnData.manufacturerGln;
      enrichedFields.push('manufacturerGln');
    }
    if (gdsnData.manufacturerName) {
      updateData.manufacturerName = gdsnData.manufacturerName;
      enrichedFields.push('manufacturerName');
    }
    if (gdsnData.gpcCategoryCode) {
      updateData.tradeItemClassification = gdsnData.gpcCategoryCode;
      enrichedFields.push('tradeItemClassification');
    }
    if (gdsnData.targetMarket?.length > 0) {
      updateData.targetMarket = gdsnData.targetMarket;
      enrichedFields.push('targetMarket');
    }
    if (gdsnData.isRegulatedDevice !== undefined) {
      updateData.isRegulatedDevice = gdsnData.isRegulatedDevice;
      enrichedFields.push('isRegulatedDevice');
    }
    if (gdsnData.deviceRiskClass) {
      updateData.deviceRiskClass = gdsnData.deviceRiskClass;
      enrichedFields.push('deviceRiskClass');
    }
    if (gdsnData.udiDi) {
      updateData.udiDi = gdsnData.udiDi;
      enrichedFields.push('udiDi');
    }
    if (gdsnData.gmdnCode) {
      updateData.gmdnCode = gdsnData.gmdnCode;
      enrichedFields.push('gmdnCode');
    }
    if (gdsnData.netContentValue) {
      updateData.netContentValue = gdsnData.netContentValue;
      updateData.netContentUom = gdsnData.netContentUom;
      enrichedFields.push('netContent');
    }
    if (gdsnData.grossWeight) {
      updateData.grossWeight = gdsnData.grossWeight;
      updateData.grossWeightUom = gdsnData.grossWeightUom;
      enrichedFields.push('grossWeight');
    }
    
    // Update timestamps
    updateData.gs1SyncedAt = new Date();
    updateData.isGs1Product = true;
    
    // Apply update
    if (Object.keys(updateData).length > 0) {
      await this.productRepo.updateProduct(productId, updateData, options);
    }
    
    return enrichedFields;
  }
  
  /**
   * Enrich regulatory info from GDSN data
   */
  private async enrichRegulatory(
    productId: string,
    regulatoryData: NonNullable<GdsnProductData['regulatoryInfo']>,
    options: { tx?: any }
  ): Promise<void> {
    await this.regulatoryRepo.upsertByProductAuthority(
      productId,
      regulatoryData.authority,
      {
        region: regulatoryData.region,
        status: regulatoryData.status,
        certificateNumber: regulatoryData.certificateNumber,
        registrationId: regulatoryData.registrationId,
        udiDi: regulatoryData.udiDi,
        udiPi: regulatoryData.udiPi,
        issuingAgency: regulatoryData.issuingAgency,
        issuedDate: regulatoryData.issuedDate,
        expirationDate: regulatoryData.expirationDate,
        notifiedBodyId: regulatoryData.notifiedBodyId,
        notifiedBodyName: regulatoryData.notifiedBodyName,
      },
      options
    );
  }
  
  /**
   * Enrich logistics info from GDSN data
   */
  private async enrichLogistics(
    productId: string,
    logisticsData: NonNullable<GdsnProductData['logisticsInfo']>,
    options: { tx?: any }
  ): Promise<void> {
    await this.logisticsRepo.upsert(
      productId,
      {
        storageTemp: logisticsData.storageTemp,
        storageHumidity: logisticsData.storageHumidity,
        isHazardous: logisticsData.isHazardous,
        hazardClass: logisticsData.hazardClass,
        shelfLifeDays: logisticsData.shelfLifeDays,
        countryOfOrigin: logisticsData.countryOfOrigin,
        hsCode: logisticsData.hsCode,
      },
      options
    );
  }
  
  /**
   * Update quality score after enrichment
   * 
   * TODO (Phase 5): Implement proper quality scoring rules
   */
  private async updateQualityScore(
    productId: string,
    options: { tx?: any }
  ): Promise<void> {
    // Phase 1: Stub implementation with placeholder scores
    // Real implementation will calculate scores based on data completeness
    
    const product = await this.productRepo.findProductById(productId, options);
    if (!product) return;
    
    // Simple scoring based on field presence
    let basicDataScore = 0;
    if (product.name) basicDataScore += 25;
    if (product.brand) basicDataScore += 25;
    if (product.description) basicDataScore += 25;
    if (product.gtin) basicDataScore += 25;
    
    let gs1DataScore = 0;
    if (product.gs1VerificationStatus === 'VERIFIED') gs1DataScore = 100;
    else if (product.gs1VerificationStatus === 'PENDING') gs1DataScore = 50;
    
    // TODO: Calculate media, document, regulatory, packaging scores
    const mediaScore = 0; // Phase 4
    const documentScore = 0; // Phase 4
    const regulatoryScore = 0; // Phase 5
    const packagingScore = 0; // Phase 4
    
    const overallScore = Math.round(
      (basicDataScore + gs1DataScore + mediaScore + documentScore + regulatoryScore + packagingScore) / 6
    );
    
    const missingFields: string[] = [];
    if (!product.name) missingFields.push('name');
    if (!product.brand) missingFields.push('brand');
    if (!product.gtin) missingFields.push('gtin');
    
    await this.qualityRepo.upsert(productId, {
      overallScore,
      basicDataScore,
      gs1DataScore,
      mediaScore,
      documentScore,
      regulatoryScore,
      packagingScore,
      missingFields,
      warnings: [],
    }, options);
  }
  
  /**
   * Batch enrich multiple products
   */
  async batchEnrich(productIds: string[]): Promise<EnrichmentResult[]> {
    logger.info({
      module: 'ProductEnrichmentService',
      operation: 'batchEnrich',
      count: productIds.length,
    }, 'Starting batch enrichment');
    
    const results: EnrichmentResult[] = [];
    
    for (const productId of productIds) {
      const result = await this.enrichFromGdsn(productId);
      results.push(result);
    }
    
    const successful = results.filter(r => r.success).length;
    
    logger.info({
      module: 'ProductEnrichmentService',
      operation: 'batchEnrich',
      total: productIds.length,
      successful,
      failed: productIds.length - successful,
    }, 'Batch enrichment completed');
    
    return results;
  }
  
  /**
   * Find products that need enrichment
   */
  async findProductsNeedingEnrichment(limit: number = 100): Promise<string[]> {
    // Find products with GTIN but not verified
    const products = await this.productRepo.findProductsForGs1Refresh(limit);
    return products.map(p => p.id);
  }
}

// Singleton instance
let enrichmentServiceInstance: ProductEnrichmentService | null = null;

export function getProductEnrichmentService(): ProductEnrichmentService {
  if (!enrichmentServiceInstance) {
    enrichmentServiceInstance = new ProductEnrichmentService();
  }
  return enrichmentServiceInstance;
}

