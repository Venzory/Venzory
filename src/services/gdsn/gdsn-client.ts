/**
 * GDSN Client Interface (GS1 Foundation - Phase 6)
 * 
 * Defines the interface for GDSN data pool communication.
 * This interface will be implemented by specific providers (1WorldSync, Syndigo, GS1 GO).
 * 
 * Data Flow:
 *   Provider API → Raw Response → GDSN Domain Types → Prisma Models
 * 
 * @see docs/gs1/GDSN_PROVIDER_BLUEPRINT.md for implementation guide
 */

import type { PackagingLevel, MediaType, DocumentType, RegulatoryAuthority, ComplianceStatus } from '@prisma/client';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error class for all GDSN-related errors
 */
export class GdsnError extends Error {
  constructor(
    message: string,
    public readonly code: GdsnErrorCode,
    public readonly providerId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GdsnError';
  }
}

/**
 * Authentication/authorization errors with the GDSN provider
 */
export class GdsnAuthenticationError extends GdsnError {
  constructor(message: string, providerId?: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', providerId, details);
    this.name = 'GdsnAuthenticationError';
  }
}

/**
 * Rate limit exceeded error
 */
export class GdsnRateLimitError extends GdsnError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    providerId?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', providerId, details);
    this.name = 'GdsnRateLimitError';
  }
}

/**
 * Network/connectivity errors
 */
export class GdsnNetworkError extends GdsnError {
  constructor(message: string, providerId?: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', providerId, details);
    this.name = 'GdsnNetworkError';
  }
}

/**
 * Data validation/parsing errors
 */
export class GdsnValidationError extends GdsnError {
  constructor(message: string, providerId?: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', providerId, details);
    this.name = 'GdsnValidationError';
  }
}

/**
 * Error codes for GDSN operations
 */
export type GdsnErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for GDSN client instances
 */
export interface GdsnClientConfig {
  /** Provider identifier (e.g., "1worldsync", "syndigo", "gs1go") */
  providerId: string;
  
  /** Base URL for the provider's API */
  baseUrl: string;
  
  /** Authentication credentials */
  auth: GdsnAuthConfig;
  
  /** Your organization's GLN (Global Location Number) */
  subscriberGln: string;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  
  /** Enable debug logging (default: false) */
  debug?: boolean;
  
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

/**
 * Authentication configuration
 */
export interface GdsnAuthConfig {
  /** Authentication type */
  type: 'api_key' | 'oauth2' | 'basic';
  
  /** API key (for api_key auth) */
  apiKey?: string;
  
  /** OAuth2 client ID (for oauth2 auth) */
  clientId?: string;
  
  /** OAuth2 client secret (for oauth2 auth) */
  clientSecret?: string;
  
  /** OAuth2 token endpoint (for oauth2 auth) */
  tokenUrl?: string;
  
  /** Basic auth username (for basic auth) */
  username?: string;
  
  /** Basic auth password (for basic auth) */
  password?: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination options for batch requests
 */
export interface GdsnPaginationOptions {
  /** Page number (1-based) */
  page?: number;
  
  /** Number of items per page (default: 100, max: 1000) */
  pageSize?: number;
  
  /** Cursor for cursor-based pagination (provider-specific) */
  cursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface GdsnPaginatedResponse<T> {
  /** The items in this page */
  items: T[];
  
  /** Total number of items across all pages */
  totalCount: number;
  
  /** Current page number */
  page: number;
  
  /** Items per page */
  pageSize: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Whether there are more pages */
  hasNextPage: boolean;
  
  /** Cursor for next page (if using cursor-based pagination) */
  nextCursor?: string;
}

// ============================================================================
// Change Notification Types
// ============================================================================

/**
 * Options for listing changes/CIN messages
 */
export interface GdsnListChangesOptions {
  /** Only fetch changes since this date */
  since: Date;
  
  /** Only fetch changes until this date (default: now) */
  until?: Date;
  
  /** Filter by change type */
  changeTypes?: Array<'ADD' | 'CHANGE' | 'DELETE'>;
  
  /** Filter by GPC category */
  gpcCategory?: string;
  
  /** Filter by target market */
  targetMarket?: string;
  
  /** Pagination options */
  pagination?: GdsnPaginationOptions;
}

/**
 * Options for batch product fetching
 */
export interface GdsnFetchBatchOptions {
  /** Filter by GPC category */
  gpcCategory?: string;
  
  /** Filter by manufacturer GLN */
  manufacturerGln?: string;
  
  /** Filter by target market */
  targetMarket?: string;
  
  /** Only fetch products modified since this date */
  modifiedSince?: Date;
  
  /** Pagination options */
  pagination?: GdsnPaginationOptions;
}

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

// ============================================================================
// GDSN Client Interface
// ============================================================================

/**
 * GDSN Client Interface
 * 
 * Implement this interface for each data pool provider.
 * 
 * Providers should:
 * 1. Parse provider-specific API responses into ProviderRawResponse
 * 2. Use GdsnMapper to convert raw responses to GdsnProductData
 * 3. Handle authentication, rate limiting, and retries
 * 4. Throw appropriate GdsnError subclasses on failure
 * 
 * @example
 * ```typescript
 * class MyProvider implements IGdsnClient {
 *   readonly providerId = 'myprovider';
 *   
 *   async fetchProductByGtin(gtin: string): Promise<GdsnProductData | null> {
 *     const response = await this.api.get(`/products/${gtin}`);
 *     if (!response.data) return null;
 *     return GdsnMapper.mapToGdsnProductData(response.data);
 *   }
 * }
 * ```
 */
export interface IGdsnClient {
  /**
   * Provider identifier (e.g., "1worldsync", "syndigo", "gs1go", "mock")
   */
  readonly providerId: string;
  
  /**
   * Provider configuration (if available)
   */
  readonly config?: GdsnClientConfig;
  
  // --------------------------------------------------------------------------
  // Connection & Authentication
  // --------------------------------------------------------------------------
  
  /**
   * Check if the client is connected and authenticated
   * @throws GdsnAuthenticationError if credentials are invalid
   * @throws GdsnNetworkError if unable to connect
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Initialize/authenticate the client (if required by provider)
   * Called automatically on first request if not already connected.
   * @throws GdsnAuthenticationError if authentication fails
   */
  connect?(): Promise<void>;
  
  /**
   * Disconnect/cleanup resources
   */
  disconnect?(): Promise<void>;
  
  // --------------------------------------------------------------------------
  // Product Retrieval
  // --------------------------------------------------------------------------
  
  /**
   * Fetch product data by GTIN
   * @param gtin - The GTIN to look up (GTIN-8, GTIN-12, GTIN-13, or GTIN-14)
   * @returns Product data or null if not found
   * @throws GdsnError on provider errors
   */
  fetchProductByGtin(gtin: string): Promise<GdsnProductData | null>;
  
  /**
   * Fetch multiple products by GTINs (batch)
   * @param gtins - Array of GTINs to look up
   * @returns Map of GTIN to product data (null for not found)
   * @throws GdsnError on provider errors
   */
  fetchProductsByGtins(gtins: string[]): Promise<Map<string, GdsnProductData | null>>;
  
  /**
   * Fetch products with pagination
   * Use this for bulk synchronization rather than fetchProductsByGtins.
   * @param options - Filter and pagination options
   * @returns Paginated list of products
   * @throws GdsnError on provider errors
   */
  fetchProductBatch(options: GdsnFetchBatchOptions): Promise<GdsnPaginatedResponse<GdsnProductData>>;
  
  /**
   * Search products by criteria
   * @param query - Search criteria
   * @returns Array of matching products (limited)
   * @throws GdsnError on provider errors
   */
  searchProducts(query: {
    gpcCategory?: string;
    manufacturerGln?: string;
    targetMarket?: string;
    limit?: number;
  }): Promise<GdsnProductData[]>;
  
  /**
   * Verify GTIN exists in GDSN registry
   * Faster than fetchProductByGtin when you only need existence check.
   * @param gtin - The GTIN to verify
   * @returns true if GTIN exists in registry
   */
  verifyGtin(gtin: string): Promise<boolean>;
  
  // --------------------------------------------------------------------------
  // Change Notifications (CIN)
  // --------------------------------------------------------------------------
  
  /**
   * List Change In Notification (CIN) messages
   * Use this for incremental synchronization to get products that changed.
   * @param options - Filter options including date range
   * @returns Paginated list of CIN messages
   * @throws GdsnError on provider errors
   */
  listChanges(options: GdsnListChangesOptions): Promise<GdsnPaginatedResponse<GdsnCinMessage>>;
  
  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------
  
  /**
   * Create a subscription for CIN notifications
   * @param request - Subscription parameters
   * @returns Provider subscription ID
   * @throws GdsnError on provider errors
   */
  createSubscription(request: GdsnSubscriptionRequest): Promise<string>;
  
  /**
   * Cancel a subscription
   * @param subscriptionId - The subscription ID to cancel
   * @throws GdsnError on provider errors
   */
  cancelSubscription(subscriptionId: string): Promise<void>;
  
  /**
   * List active subscriptions
   * @returns Array of subscription IDs
   */
  listSubscriptions?(): Promise<string[]>;
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Factory function signature for creating GDSN clients
 */
export type GdsnClientFactory = (config: GdsnClientConfig) => IGdsnClient;

