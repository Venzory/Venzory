/**
 * Products domain models
 * These models represent the business entities for product catalog management
 * 
 * GS1 Foundation (Phase 1): Enhanced with manufacturer-level GS1 attributes
 */

import type { BaseEntity } from './common';

export type Gs1VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export type IntegrationType = 'MANUAL' | 'API' | 'EDI' | 'OCI' | 'CSV';

// GS1 Foundation (Phase 1) - New enums
export type PackagingLevel = 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
export type MediaType = 'PRODUCT_IMAGE' | 'MARKETING_IMAGE' | 'PLANOGRAM' | 'VIDEO' | 'THREE_D_MODEL';
export type DocumentType = 'IFU' | 'SDS' | 'CE_DECLARATION' | 'FDA_510K' | 'TECHNICAL_FILE' | 'LABEL_ARTWORK' | 'CLINICAL_DATA' | 'RISK_ANALYSIS' | 'OTHER';
export type RegulatoryAuthority = 'EU_MDR' | 'EU_IVDR' | 'FDA' | 'TGA' | 'HEALTH_CANADA' | 'PMDA' | 'NMPA' | 'OTHER';
export type ComplianceStatus = 'UNKNOWN' | 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'EXEMPT' | 'EXPIRED';
export type MatchMethod = 'MANUAL' | 'EXACT_GTIN' | 'FUZZY_NAME' | 'BARCODE_SCAN' | 'SUPPLIER_MAPPED';

/**
 * Product - Canonical product data (GS1-driven, shared across practices)
 * 
 * Enhanced with GS1 Foundation (Phase 1) attributes for manufacturer-level data
 */
export interface Product extends BaseEntity {
  gtin: string | null;
  brand: string | null;
  name: string;
  description: string | null;
  shortDescription?: string | null;
  
  // GS1 Core Attributes (Phase 1)
  manufacturerGln?: string | null;
  manufacturerName?: string | null;
  tradeItemClassification?: string | null;
  targetMarket?: string[];
  
  // Medical Device Specific (MDR/IVDR)
  isRegulatedDevice?: boolean;
  deviceRiskClass?: string | null;
  udiDi?: string | null;
  gudidDatabaseId?: string | null;
  eudamedId?: string | null;
  gmdnCode?: string | null;
  
  // Physical attributes
  netContentValue?: number | null;
  netContentUom?: string | null;
  grossWeight?: number | null;
  grossWeightUom?: string | null;
  
  // GS1 Verification
  isGs1Product: boolean;
  gs1VerificationStatus: Gs1VerificationStatus;
  gs1VerifiedAt: Date | null;
  gs1SyncedAt?: Date | null;
  gs1Data: Record<string, any> | null;
  
  // Version tracking
  version?: number;
  
  // Optional relations
  items?: any[];
  supplierItems?: SupplierItem[];
}

/**
 * Global Supplier Item (formerly SupplierCatalog)
 * Link between Global Supplier and Global Product
 * 
 * Enhanced with GS1 Foundation (Phase 1) matching fields
 */
export interface SupplierItem extends BaseEntity {
  globalSupplierId: string;
  productId: string;
  
  // Supplier's data
  supplierSku: string | null;
  supplierName?: string | null;
  supplierDescription?: string | null;
  
  // Pricing
  unitPrice: number | null;
  currency: string | null;
  minOrderQty: number | null;
  
  // Stock (from supplier catalog)
  stockLevel?: number | null;
  leadTimeDays?: number | null;
  
  // Match quality (Phase 1)
  matchMethod?: MatchMethod;
  matchConfidence?: number | null;
  matchedAt?: Date | null;
  matchedBy?: string | null;
  needsReview?: boolean; // Phase 5: Flag for manual review queue
  
  // Integration
  integrationType: IntegrationType;
  integrationConfig: Record<string, any> | null;
  lastSyncAt: Date | null;
  isActive: boolean;
}

/**
 * Supplier item with related entities
 */
export interface SupplierItemWithRelations extends SupplierItem {
  globalSupplier?: any; // GlobalSupplier
  product?: Product;
}

/**
 * Input type for creating a product
 */
export interface CreateProductInput {
  gtin?: string | null;
  brand?: string | null;
  name: string;
  description?: string | null;
  isGs1Product?: boolean;
}

/**
 * Input type for updating a product
 */
export interface UpdateProductInput {
  gtin?: string | null;
  brand?: string | null;
  name?: string;
  description?: string | null;
  isGs1Product?: boolean;
  gs1VerificationStatus?: Gs1VerificationStatus;
  gs1VerifiedAt?: Date | null;
  gs1Data?: Record<string, any> | null;
}

/**
 * Input type for creating/updating supplier item (global)
 */
export interface UpsertSupplierItemInput {
  globalSupplierId: string;
  productId: string;
  supplierSku?: string | null;
  supplierName?: string | null;
  supplierDescription?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  stockLevel?: number | null;
  leadTimeDays?: number | null;
  integrationType?: IntegrationType;
  integrationConfig?: Record<string, any> | null;
  isActive?: boolean;
  // Match fields (Phase 5)
  matchMethod?: MatchMethod;
  matchConfidence?: number | null;
  matchedBy?: string | null;
  needsReview?: boolean;
}

/**
 * Product query filters
 */
export interface ProductFilters {
  search?: string;
  isGs1Product?: boolean;
  gs1VerificationStatus?: Gs1VerificationStatus;
  globalSupplierId?: string; // Filter by GlobalSupplier
  practiceId?: string; // Filter products available to a specific practice
}

/**
 * Supplier item query filters
 */
export interface SupplierItemFilters {
  search?: string;
  globalSupplierId?: string;
  productId?: string;
  practiceId?: string;
  isActive?: boolean;
}

/**
 * GS1 lookup response
 */
export interface Gs1LookupResult {
  gtin: string;
  brand: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  verified: boolean;
  rawData: Record<string, any>;
}

/**
 * Product data for import/sync
 */
export interface ProductSyncData {
  gtin?: string | null;
  brand?: string | null;
  name: string;
  description?: string | null;
  gs1VerificationStatus?: Gs1VerificationStatus;
  gs1Data?: Record<string, any> | null;
}

/**
 * Catalog entry for supplier feed processing
 */
export interface CatalogSyncData {
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  integrationType: IntegrationType;
  integrationConfig?: Record<string, any> | null;
  isActive?: boolean;
}

/**
 * Combined supplier feed data
 */
export interface SupplierFeedData {
  product: ProductSyncData;
  catalog: CatalogSyncData;
}

