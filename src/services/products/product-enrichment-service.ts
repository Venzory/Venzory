/**
 * Product Enrichment Service (GS1 Foundation - Phase 2)
 * 
 * Handles enriching products with GS1/GDSN data.
 * Phase 2: Full enrichment pipeline with packaging, media, documents mapping
 */

import { PackagingLevel, MediaType, DocumentType } from '@prisma/client';
import { ProductRepository } from '@/src/repositories/products';
import {
  PackagingRepository,
  MediaRepository,
  DocumentRepository,
  RegulatoryRepository,
  LogisticsRepository,
  QualityRepository,
} from '@/src/repositories/products';
import { 
  GdsnService, 
  getGdsnService, 
  type GdsnProductData,
  type GdsnPackagingData,
  type GdsnMediaData,
  type GdsnDocumentData,
} from '@/src/services/gdsn';
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
        if (gdsnData.packagingHierarchy?.length > 0) {
          const packagingCount = await this.enrichPackaging(productId, gdsnData.packagingHierarchy, { tx });
          result.enrichedFields.push(`packaging (${packagingCount} levels)`);
        }
        
        // 4c. Process media (store references, not downloading files yet)
        if (gdsnData.digitalAssets?.length > 0) {
          const mediaCount = await this.enrichMedia(productId, gdsnData.digitalAssets, { tx });
          result.enrichedFields.push(`media (${mediaCount} assets)`);
        }
        
        // 4d. Process documents (store references, not downloading files yet)
        if (gdsnData.referencedDocuments?.length > 0) {
          const docCount = await this.enrichDocuments(productId, gdsnData.referencedDocuments, { tx });
          result.enrichedFields.push(`documents (${docCount} docs)`);
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
        
        // 4h. Recalculate quality score with all component data
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
   * Enrich packaging hierarchy from GDSN data
   */
  private async enrichPackaging(
    productId: string,
    packagingData: GdsnPackagingData[],
    options: { tx?: any }
  ): Promise<number> {
    // Clear existing packaging for this product first
    await this.packagingRepo.deleteByProductId(productId, options);
    
    // Map GDSN packaging levels to our enum
    const levelMap: Record<string, PackagingLevel> = {
      'EACH': PackagingLevel.EACH,
      'INNER_PACK': PackagingLevel.INNER_PACK,
      'CASE': PackagingLevel.CASE,
      'PALLET': PackagingLevel.PALLET,
    };
    
    let count = 0;
    
    for (const pkg of packagingData) {
      const level = levelMap[pkg.level];
      if (!level) {
        logger.warn({
          module: 'ProductEnrichmentService',
          operation: 'enrichPackaging',
          productId,
          level: pkg.level,
        }, 'Unknown packaging level, skipping');
        continue;
      }
      
      await this.packagingRepo.create({
        productId,
        level,
        gtin: pkg.gtin,
        childCount: pkg.childCount,
        height: pkg.height,
        width: pkg.width,
        depth: pkg.depth,
        dimensionUom: pkg.dimensionUom || 'cm',
        grossWeight: pkg.grossWeight,
        weightUom: pkg.weightUom || 'kg',
      }, options);
      
      count++;
    }
    
    return count;
  }
  
  /**
   * Enrich media assets from GDSN data
   * Note: This stores references to media URLs. Actual file downloading
   * will be implemented in Phase 4.
   */
  private async enrichMedia(
    productId: string,
    mediaData: GdsnMediaData[],
    options: { tx?: any }
  ): Promise<number> {
    // Clear existing media for this product first
    await this.mediaRepo.deleteByProductId(productId, options);
    
    // Map GDSN media types to our enum
    const typeMap: Record<string, MediaType> = {
      'PRODUCT_IMAGE': MediaType.PRODUCT_IMAGE,
      'MARKETING_IMAGE': MediaType.MARKETING_IMAGE,
      'PLANOGRAM': MediaType.PLANOGRAM,
      'VIDEO': MediaType.VIDEO,
      'THREE_D_MODEL': MediaType.THREE_D_MODEL,
    };
    
    let count = 0;
    
    for (const media of mediaData) {
      const type = typeMap[media.type];
      if (!type) {
        logger.warn({
          module: 'ProductEnrichmentService',
          operation: 'enrichMedia',
          productId,
          type: media.type,
        }, 'Unknown media type, skipping');
        continue;
      }
      
      await this.mediaRepo.create({
        productId,
        type,
        url: media.url,
        filename: media.filename,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        isPrimary: media.isPrimary,
        angle: media.angle,
        // storageProvider and storageKey will be set when files are downloaded (Phase 4)
      }, options);
      
      count++;
    }
    
    return count;
  }
  
  /**
   * Enrich documents from GDSN data
   * Note: This stores references to document URLs. Actual file downloading
   * will be implemented in Phase 4.
   */
  private async enrichDocuments(
    productId: string,
    documentData: GdsnDocumentData[],
    options: { tx?: any }
  ): Promise<number> {
    // Clear existing documents for this product first
    await this.documentRepo.deleteByProductId(productId, options);
    
    // Map GDSN document types to our enum
    const typeMap: Record<string, DocumentType> = {
      'IFU': DocumentType.IFU,
      'SDS': DocumentType.SDS,
      'CE_DECLARATION': DocumentType.CE_DECLARATION,
      'FDA_510K': DocumentType.FDA_510K,
      'TECHNICAL_FILE': DocumentType.TECHNICAL_FILE,
      'LABEL_ARTWORK': DocumentType.LABEL_ARTWORK,
      'CLINICAL_DATA': DocumentType.CLINICAL_DATA,
      'RISK_ANALYSIS': DocumentType.RISK_ANALYSIS,
      'OTHER': DocumentType.OTHER,
    };
    
    let count = 0;
    
    for (const doc of documentData) {
      const type = typeMap[doc.type];
      if (!type) {
        logger.warn({
          module: 'ProductEnrichmentService',
          operation: 'enrichDocuments',
          productId,
          type: doc.type,
        }, 'Unknown document type, skipping');
        continue;
      }
      
      await this.documentRepo.create({
        productId,
        type,
        title: doc.title,
        language: doc.language || 'en',
        url: doc.url,
        filename: doc.filename,
        effectiveDate: doc.effectiveDate,
        expirationDate: doc.expirationDate,
        version: doc.version,
        // storageProvider and storageKey will be set when files are downloaded (Phase 4)
      }, options);
      
      count++;
    }
    
    return count;
  }
  
  /**
   * Update quality score after enrichment
   * Calculates scores based on data completeness across all components
   */
  private async updateQualityScore(
    productId: string,
    options: { tx?: any }
  ): Promise<void> {
    const product = await this.productRepo.findProductById(productId, options);
    if (!product) return;
    
    // Fetch related data counts
    const [mediaCount, documentCount, regulatoryCount, packagingCount] = await Promise.all([
      this.mediaRepo.countByProductId(productId, options),
      this.documentRepo.countByProductId(productId, options),
      this.regulatoryRepo.countByProductId(productId, options),
      this.packagingRepo.findByProductId(productId, options).then(p => p.length),
    ]);
    
    // Calculate basic data score (0-100)
    let basicDataScore = 0;
    if (product.name) basicDataScore += 25;
    if (product.brand) basicDataScore += 25;
    if (product.description || product.shortDescription) basicDataScore += 25;
    if (product.gtin) basicDataScore += 25;
    
    // Calculate GS1 data score (0-100)
    let gs1DataScore = 0;
    if (product.gs1VerificationStatus === 'VERIFIED') gs1DataScore = 100;
    else if (product.gs1VerificationStatus === 'PENDING') gs1DataScore = 50;
    else if (product.gtin && product.isGs1Product) gs1DataScore = 25;
    else if (product.gtin) gs1DataScore = 10;
    
    // Calculate media score (0-100)
    let mediaScore = 0;
    if (mediaCount >= 5) mediaScore = 100;
    else if (mediaCount >= 3) mediaScore = 80;
    else if (mediaCount >= 1) mediaScore = 50;
    
    // Calculate document score (0-100)
    let documentScore = 0;
    const isRegulatedDevice = product.isRegulatedDevice ?? false;
    if (isRegulatedDevice) {
      // Stricter requirements for medical devices
      if (documentCount >= 3) documentScore = 100;
      else if (documentCount >= 2) documentScore = 70;
      else if (documentCount >= 1) documentScore = 40;
    } else {
      if (documentCount >= 2) documentScore = 100;
      else if (documentCount >= 1) documentScore = 60;
    }
    
    // Calculate regulatory score (0-100)
    let regulatoryScore = 0;
    if (!isRegulatedDevice) {
      // Non-regulated products get good score if they have any regulatory info
      regulatoryScore = regulatoryCount > 0 ? 100 : 50;
    } else {
      // Medical devices require regulatory data
      if (regulatoryCount >= 2) regulatoryScore = 100;
      else if (regulatoryCount >= 1) regulatoryScore = 60;
    }
    
    // Calculate packaging score (0-100)
    let packagingScore = 0;
    if (packagingCount >= 3) packagingScore = 100;
    else if (packagingCount >= 2) packagingScore = 70;
    else if (packagingCount >= 1) packagingScore = 40;
    
    // Calculate overall weighted score
    const overallScore = Math.round(
      basicDataScore * 0.20 +
      gs1DataScore * 0.25 +
      mediaScore * 0.15 +
      documentScore * 0.15 +
      regulatoryScore * 0.15 +
      packagingScore * 0.10
    );
    
    // Identify missing fields and warnings
    const missingFields: string[] = [];
    const warnings: string[] = [];
    
    if (!product.name) missingFields.push('name');
    if (!product.brand) missingFields.push('brand');
    if (!product.gtin) missingFields.push('gtin');
    if (mediaCount === 0) missingFields.push('media');
    
    if (isRegulatedDevice) {
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
    
    if (product.gtin && product.gs1VerificationStatus !== 'VERIFIED') {
      warnings.push('Product has GTIN but is not GS1 verified');
    }
    
    await this.qualityRepo.upsert(productId, {
      overallScore,
      basicDataScore,
      gs1DataScore,
      mediaScore,
      documentScore,
      regulatoryScore,
      packagingScore,
      missingFields,
      warnings,
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

