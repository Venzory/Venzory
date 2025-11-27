/**
 * GDSN Client Interface (GS1 Foundation - Phase 1)
 * 
 * Defines the interface for GDSN data pool communication.
 * This interface will be implemented by specific providers (1WorldSync, Syndigo, GS1 GO)
 * in Phase 2.
 */

import type { PackagingLevel, MediaType, DocumentType, RegulatoryAuthority, ComplianceStatus } from '@prisma/client';

/**
 * GS1 Product data from GDSN
 */
export interface GdsnProductData {
  gtin: string;
  
  // Basic info
  tradeItemDescription: string;
  brandName: string | null;
  shortDescription: string | null;
  
  // Manufacturer info
  manufacturerGln: string | null;
  manufacturerName: string | null;
  
  // Classification
  gpcCategoryCode: string | null;
  targetMarket: string[];
  
  // Physical attributes
  netContentValue: number | null;
  netContentUom: string | null;
  grossWeight: number | null;
  grossWeightUom: string | null;
  
  // Medical device fields
  isRegulatedDevice: boolean;
  deviceRiskClass: string | null;
  udiDi: string | null;
  gmdnCode: string | null;
  
  // Related data
  packagingHierarchy: GdsnPackagingData[];
  digitalAssets: GdsnMediaData[];
  referencedDocuments: GdsnDocumentData[];
  regulatoryInfo: GdsnRegulatoryData | null;
  logisticsInfo: GdsnLogisticsData | null;
  
  // Raw data for debugging/audit
  raw: Record<string, unknown>;
}

export interface GdsnPackagingData {
  level: 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
  gtin: string | null;
  childCount: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimensionUom: string | null;
  grossWeight: number | null;
  weightUom: string | null;
}

export interface GdsnMediaData {
  type: 'PRODUCT_IMAGE' | 'MARKETING_IMAGE' | 'PLANOGRAM' | 'VIDEO' | 'THREE_D_MODEL';
  url: string;
  filename: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  angle: string | null;
}

export interface GdsnDocumentData {
  type: 'IFU' | 'SDS' | 'CE_DECLARATION' | 'FDA_510K' | 'TECHNICAL_FILE' | 'LABEL_ARTWORK' | 'CLINICAL_DATA' | 'RISK_ANALYSIS' | 'OTHER';
  title: string;
  language: string;
  url: string;
  filename: string | null;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  version: string | null;
}

export interface GdsnRegulatoryData {
  authority: 'EU_MDR' | 'EU_IVDR' | 'FDA' | 'TGA' | 'HEALTH_CANADA' | 'PMDA' | 'NMPA' | 'OTHER';
  region: string | null;
  status: 'UNKNOWN' | 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'EXEMPT' | 'EXPIRED';
  certificateNumber: string | null;
  registrationId: string | null;
  udiDi: string | null;
  udiPi: string | null;
  issuingAgency: string | null;
  issuedDate: Date | null;
  expirationDate: Date | null;
  notifiedBodyId: string | null;
  notifiedBodyName: string | null;
}

export interface GdsnLogisticsData {
  storageTemp: string | null;
  storageHumidity: string | null;
  isHazardous: boolean;
  hazardClass: string | null;
  shelfLifeDays: number | null;
  countryOfOrigin: string | null;
  hsCode: string | null;
}

/**
 * GDSN Subscription creation request
 */
export interface GdsnSubscriptionRequest {
  targetGln: string;
  sourceGln?: string;
  gpcCategory?: string;
  targetMarket?: string;
}

/**
 * GDSN Change In Notification (CIN) message
 */
export interface GdsnCinMessage {
  messageId: string;
  gtin: string;
  sourceGln: string;
  changeType: 'ADD' | 'CHANGE' | 'DELETE';
  effectiveDate: Date;
  timestamp: Date;
}

/**
 * GDSN Client Interface
 * 
 * Implement this interface for each data pool provider.
 * Phase 1: Mock implementation only
 * Phase 2+: Real implementations for 1WorldSync, Syndigo, GS1 GO
 */
export interface IGdsnClient {
  /**
   * Provider identifier (e.g., "1worldsync", "syndigo", "gs1go", "mock")
   */
  readonly providerId: string;
  
  /**
   * Check if the client is connected and authenticated
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Fetch product data by GTIN
   */
  fetchProductByGtin(gtin: string): Promise<GdsnProductData | null>;
  
  /**
   * Fetch multiple products by GTINs (batch)
   */
  fetchProductsByGtins(gtins: string[]): Promise<Map<string, GdsnProductData | null>>;
  
  /**
   * Search products by criteria
   */
  searchProducts(query: {
    gpcCategory?: string;
    manufacturerGln?: string;
    targetMarket?: string;
    limit?: number;
  }): Promise<GdsnProductData[]>;
  
  /**
   * Create a subscription for CIN notifications
   */
  createSubscription(request: GdsnSubscriptionRequest): Promise<string>; // Returns subscription ID
  
  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>;
  
  /**
   * Verify GTIN exists in GDSN registry
   */
  verifyGtin(gtin: string): Promise<boolean>;
}

