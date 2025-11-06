/**
 * Integration Pipeline Types
 * 
 * This module defines standardized interfaces for supplier data ingestion
 * across multiple integration types (API, EDI, OCI, CSV, Manual).
 * 
 * The goal is to normalize any supplier format into a canonical structure
 * that can be processed uniformly to create/update Products and SupplierCatalogs.
 */

import { IntegrationType, Gs1VerificationStatus } from '@prisma/client';

/**
 * Standardized product data structure
 * This represents the core product information that should come from any supplier feed
 */
export interface ProductData {
  gtin?: string;                    // Global Trade Item Number (optional for non-GS1 products)
  brand?: string;
  name: string;
  description?: string;
  isGs1Product: boolean;
  gs1VerificationStatus?: Gs1VerificationStatus;
  gs1Data?: Record<string, any>;    // Raw GS1 API response if available
}

/**
 * Supplier-specific catalog entry
 * Links a supplier to a product with their pricing and SKU
 */
export interface CatalogEntry {
  supplierSku?: string;
  unitPrice?: number;
  currency?: string;
  minOrderQty?: number;
  integrationType: IntegrationType;
  integrationConfig?: IntegrationConfig;
  isActive?: boolean;
}

/**
 * Configuration for different integration types
 * Stores connection details, credentials (encrypted), sync settings, etc.
 */
export interface IntegrationConfig {
  // API integration
  apiEndpoint?: string;
  apiKey?: string;                  // Should be encrypted in production
  apiVersion?: string;
  
  // EDI integration
  ediFormat?: 'EDIFACT' | 'X12' | 'XML' | 'CUSTOM';
  ediVersion?: string;
  ftpHost?: string;
  ftpPath?: string;
  
  // OCI (Open Catalog Interface) integration
  ociPunchoutUrl?: string;
  ociReturnUrl?: string;
  ociHookUrl?: string;
  
  // CSV integration
  csvFormat?: {
    delimiter?: string;
    encoding?: string;
    hasHeader?: boolean;
    columnMapping?: Record<string, string>;  // Maps CSV columns to our fields
  };
  
  // Sync settings (applicable to all types)
  syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  
  // Custom integration settings
  custom?: Record<string, any>;
}

/**
 * Combined supplier data feed entry
 * This is what external supplier data feeds get normalized into
 */
export interface SupplierDataFeed {
  product: ProductData;
  catalog: CatalogEntry;
  metadata?: {
    sourceSystem?: string;
    sourceId?: string;
    importedAt?: Date;
    importedBy?: string;
  };
}

/**
 * Batch import result
 * Returned when processing multiple supplier feed entries
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: ImportError[];
  products: {
    id: string;
    gtin?: string;
    name: string;
  }[];
}

/**
 * Error details for failed imports
 */
export interface ImportError {
  index?: number;
  supplierSku?: string;
  gtin?: string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * GS1 lookup response (from real GS1 API)
 * This will be used when we connect to actual GS1 services
 */
export interface Gs1LookupResponse {
  found: boolean;
  gtin: string;
  brand?: string;
  name?: string;
  description?: string;
  images?: string[];
  netContent?: string;
  manufacturer?: string;
  verificationStatus: Gs1VerificationStatus;
  verifiedAt: Date;
  rawData?: Record<string, any>;
}

/**
 * Supplier feed parser interface
 * Implement this for each supplier integration type
 */
export interface SupplierFeedParser {
  readonly integrationType: IntegrationType;
  parse(rawData: any): Promise<SupplierDataFeed[]>;
  validate(feed: SupplierDataFeed): boolean;
}

