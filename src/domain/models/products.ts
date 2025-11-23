/**
 * Products domain models
 * These models represent the business entities for product catalog management
 */

import type { BaseEntity } from './common';

export type Gs1VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
export type IntegrationType = 'MANUAL' | 'API' | 'EDI' | 'OCI' | 'CSV';

/**
 * Product - Canonical product data (GS1-driven, shared across practices)
 */
export interface Product extends BaseEntity {
  gtin: string | null;
  brand: string | null;
  name: string;
  description: string | null;
  isGs1Product: boolean;
  gs1VerificationStatus: Gs1VerificationStatus;
  gs1VerifiedAt: Date | null;
  gs1Data: Record<string, any> | null;
  // Optional relations
  items?: any[];
  supplierItems?: SupplierItem[];
}

/**
 * Global Supplier Item (formerly SupplierCatalog)
 * Link between Global Supplier and Global Product
 */
export interface SupplierItem extends BaseEntity {
  globalSupplierId: string;
  productId: string;
  supplierSku: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty: number | null;
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
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  integrationType?: IntegrationType;
  integrationConfig?: Record<string, any> | null;
  isActive?: boolean;
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

