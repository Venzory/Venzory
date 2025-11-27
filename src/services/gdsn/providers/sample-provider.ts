/**
 * Sample GDSN Provider (GS1 Foundation - Phase 6)
 * 
 * Demonstrates how to implement the IGdsnClient interface for a real GDSN provider.
 * This sample provider works with static XML/JSON samples to show the parsing
 * and mapping flow without requiring a live API connection.
 * 
 * Use this as a template when implementing real providers like:
 * - 1WorldSync
 * - Syndigo
 * - GS1 GO
 * 
 * @example
 * ```typescript
 * // Create a sample provider instance
 * const provider = new SampleGdsnProvider({
 *   providerId: 'sample',
 *   baseUrl: 'https://api.example.com',
 *   subscriberGln: '1234567890123',
 *   auth: { type: 'api_key', apiKey: 'test-key' },
 * });
 * 
 * // Fetch product (will use static samples)
 * const product = await provider.fetchProductByGtin('04006501003638');
 * ```
 */

import type {
  IGdsnClient,
  GdsnClientConfig,
  GdsnProductData,
  GdsnSubscriptionRequest,
  GdsnFetchBatchOptions,
  GdsnPaginatedResponse,
  GdsnListChangesOptions,
  GdsnCinMessage,
} from '../gdsn-client';
import {
  GdsnError,
  GdsnAuthenticationError,
  GdsnNetworkError,
  GdsnValidationError,
} from '../gdsn-client';
import {
  parseGdsnXmlResponse,
  parseGdsnJsonResponse,
  mapToGdsnProductData,
  mapToCinMessage,
} from '../mappers';
import {
  SAMPLE_XML_MEDICAL_DEVICE,
  SAMPLE_JSON_MEDICAL_DEVICE,
  SAMPLE_CIN_MESSAGES,
} from '../samples';
import type { ProviderCinMessage } from '../types';
import logger from '@/lib/logger';

/**
 * Sample GDSN Provider
 * 
 * This provider demonstrates the integration pattern for real GDSN data pools.
 * It uses static sample data but shows all the parsing and mapping steps
 * that would occur with a real API.
 */
export class SampleGdsnProvider implements IGdsnClient {
  readonly providerId: string;
  readonly config: GdsnClientConfig;
  
  private connected = false;
  private subscriptions = new Map<string, GdsnSubscriptionRequest>();
  private subscriptionCounter = 0;
  
  // Simulated data cache (in real provider, this would be API responses)
  private sampleProducts: Map<string, GdsnProductData> = new Map();
  
  constructor(config: GdsnClientConfig) {
    this.providerId = config.providerId || 'sample';
    this.config = config;
    
    // Initialize sample data
    this.initializeSampleData();
  }
  
  /**
   * Initialize sample data by parsing static samples
   * 
   * In a real provider, this data would come from API responses.
   * This demonstrates the parsing and mapping flow.
   */
  private initializeSampleData(): void {
    try {
      // Parse XML sample (simulates receiving XML from provider)
      const xmlRaw = parseGdsnXmlResponse(SAMPLE_XML_MEDICAL_DEVICE, this.providerId);
      const xmlProduct = mapToGdsnProductData(xmlRaw);
      this.sampleProducts.set(xmlProduct.gtin, xmlProduct);
      
      logger.debug({
        module: 'SampleGdsnProvider',
        operation: 'initializeSampleData',
        gtin: xmlProduct.gtin,
        format: 'xml',
      }, 'Parsed XML sample product');
      
      // Parse JSON sample (simulates receiving JSON from provider)
      const jsonRaw = parseGdsnJsonResponse(SAMPLE_JSON_MEDICAL_DEVICE, this.providerId);
      const jsonProduct = mapToGdsnProductData(jsonRaw);
      this.sampleProducts.set(jsonProduct.gtin, jsonProduct);
      
      logger.debug({
        module: 'SampleGdsnProvider',
        operation: 'initializeSampleData',
        gtin: jsonProduct.gtin,
        format: 'json',
      }, 'Parsed JSON sample product');
      
    } catch (error) {
      logger.error({
        module: 'SampleGdsnProvider',
        operation: 'initializeSampleData',
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to initialize sample data');
    }
  }
  
  // --------------------------------------------------------------------------
  // Connection & Authentication
  // --------------------------------------------------------------------------
  
  async isConnected(): Promise<boolean> {
    return this.connected;
  }
  
  async connect(): Promise<void> {
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'connect',
      baseUrl: this.config.baseUrl,
    }, 'Connecting to GDSN provider');
    
    // Simulate authentication
    await this.simulateNetworkDelay();
    
    // Validate configuration
    if (!this.config.auth.apiKey && this.config.auth.type === 'api_key') {
      throw new GdsnAuthenticationError(
        'API key is required',
        this.providerId,
        { authType: this.config.auth.type }
      );
    }
    
    // In a real provider, this would:
    // 1. Exchange credentials for access token (OAuth2)
    // 2. Validate API key
    // 3. Test connection to API endpoint
    
    this.connected = true;
    
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'connect',
    }, 'Connected to GDSN provider');
  }
  
  async disconnect(): Promise<void> {
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'disconnect',
    }, 'Disconnecting from GDSN provider');
    
    this.connected = false;
    this.subscriptions.clear();
  }
  
  // --------------------------------------------------------------------------
  // Product Retrieval
  // --------------------------------------------------------------------------
  
  async fetchProductByGtin(gtin: string): Promise<GdsnProductData | null> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'fetchProductByGtin',
      gtin,
    }, 'Fetching product by GTIN');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this would:
    // 1. Make HTTP request to provider API
    // 2. Parse XML/JSON response
    // 3. Map to GdsnProductData
    
    const product = this.sampleProducts.get(gtin);
    
    if (product) {
      logger.info({
        module: 'SampleGdsnProvider',
        operation: 'fetchProductByGtin',
        gtin,
        found: true,
      }, 'Product found');
      
      return {
        ...product,
        raw: {
          ...product.raw,
          _fetchedAt: new Date().toISOString(),
          _providerId: this.providerId,
        },
      };
    }
    
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'fetchProductByGtin',
      gtin,
      found: false,
    }, 'Product not found');
    
    return null;
  }
  
  async fetchProductsByGtins(gtins: string[]): Promise<Map<string, GdsnProductData | null>> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'fetchProductsByGtins',
      count: gtins.length,
    }, 'Fetching products by GTINs');
    
    await this.ensureConnected();
    
    // In a real provider, this would batch the requests
    // or use a bulk API endpoint
    
    const results = new Map<string, GdsnProductData | null>();
    
    for (const gtin of gtins) {
      const product = await this.fetchProductByGtin(gtin);
      results.set(gtin, product);
    }
    
    return results;
  }
  
  async fetchProductBatch(options: GdsnFetchBatchOptions): Promise<GdsnPaginatedResponse<GdsnProductData>> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'fetchProductBatch',
      options,
    }, 'Fetching product batch');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this would:
    // 1. Build query parameters from options
    // 2. Make paginated API request
    // 3. Parse and map response
    
    let products = Array.from(this.sampleProducts.values());
    
    // Apply filters
    if (options.gpcCategory) {
      products = products.filter(p => p.gpcCategoryCode === options.gpcCategory);
    }
    if (options.manufacturerGln) {
      products = products.filter(p => p.manufacturerGln === options.manufacturerGln);
    }
    if (options.targetMarket) {
      products = products.filter(p => p.targetMarket.includes(options.targetMarket!));
    }
    
    // Apply pagination
    const page = options.pagination?.page ?? 1;
    const pageSize = Math.min(options.pagination?.pageSize ?? 100, 1000);
    const totalCount = products.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = products.slice(startIndex, startIndex + pageSize);
    
    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
  
  async searchProducts(query: {
    gpcCategory?: string;
    manufacturerGln?: string;
    targetMarket?: string;
    limit?: number;
  }): Promise<GdsnProductData[]> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'searchProducts',
      query,
    }, 'Searching products');
    
    const result = await this.fetchProductBatch({
      ...query,
      pagination: { pageSize: query.limit ?? 100 },
    });
    
    return result.items;
  }
  
  async verifyGtin(gtin: string): Promise<boolean> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'verifyGtin',
      gtin,
    }, 'Verifying GTIN');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this might use a lighter-weight
    // verification endpoint rather than fetching full product data
    
    return this.sampleProducts.has(gtin);
  }
  
  // --------------------------------------------------------------------------
  // Change Notifications (CIN)
  // --------------------------------------------------------------------------
  
  async listChanges(options: GdsnListChangesOptions): Promise<GdsnPaginatedResponse<GdsnCinMessage>> {
    logger.debug({
      module: 'SampleGdsnProvider',
      operation: 'listChanges',
      options,
    }, 'Listing changes');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this would:
    // 1. Build query with date range
    // 2. Fetch CIN messages from provider
    // 3. Map to our CIN format
    
    // Use sample CIN messages
    let changes = SAMPLE_CIN_MESSAGES.map(msg => 
      mapToCinMessage(msg as unknown as ProviderCinMessage, this.providerId)
    );
    
    // Filter by change type if specified
    if (options.changeTypes && options.changeTypes.length > 0) {
      changes = changes.filter(c => options.changeTypes!.includes(c.changeType));
    }
    
    // Filter by date range
    changes = changes.filter(c => {
      const ts = c.timestamp.getTime();
      const since = options.since.getTime();
      const until = options.until?.getTime() ?? Date.now();
      return ts >= since && ts <= until;
    });
    
    // Apply pagination
    const page = options.pagination?.page ?? 1;
    const pageSize = Math.min(options.pagination?.pageSize ?? 100, 1000);
    const totalCount = changes.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = changes.slice(startIndex, startIndex + pageSize);
    
    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
  
  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------
  
  async createSubscription(request: GdsnSubscriptionRequest): Promise<string> {
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'createSubscription',
      request,
    }, 'Creating subscription');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this would:
    // 1. Send subscription request to provider API
    // 2. Return provider's subscription ID
    
    this.subscriptionCounter++;
    const subscriptionId = `${this.providerId}-sub-${this.subscriptionCounter}-${Date.now()}`;
    this.subscriptions.set(subscriptionId, request);
    
    return subscriptionId;
  }
  
  async cancelSubscription(subscriptionId: string): Promise<void> {
    logger.info({
      module: 'SampleGdsnProvider',
      operation: 'cancelSubscription',
      subscriptionId,
    }, 'Cancelling subscription');
    
    await this.ensureConnected();
    await this.simulateNetworkDelay();
    
    // In a real provider, this would call provider API
    
    if (!this.subscriptions.has(subscriptionId)) {
      throw new GdsnError(
        'Subscription not found',
        'NOT_FOUND',
        this.providerId,
        { subscriptionId }
      );
    }
    
    this.subscriptions.delete(subscriptionId);
  }
  
  async listSubscriptions(): Promise<string[]> {
    await this.ensureConnected();
    return Array.from(this.subscriptions.keys());
  }
  
  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------
  
  /**
   * Ensure client is connected before making API calls
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
  
  /**
   * Simulate network delay for realistic testing
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // --------------------------------------------------------------------------
  // Testing Helpers
  // --------------------------------------------------------------------------
  
  /**
   * Add a product from XML for testing
   */
  addProductFromXml(xml: string): GdsnProductData {
    const raw = parseGdsnXmlResponse(xml, this.providerId);
    const product = mapToGdsnProductData(raw);
    this.sampleProducts.set(product.gtin, product);
    return product;
  }
  
  /**
   * Add a product from JSON for testing
   */
  addProductFromJson(json: string | Record<string, unknown>): GdsnProductData {
    const raw = parseGdsnJsonResponse(json, this.providerId);
    const product = mapToGdsnProductData(raw);
    this.sampleProducts.set(product.gtin, product);
    return product;
  }
  
  /**
   * Get list of loaded GTINs for testing
   */
  getLoadedGtins(): string[] {
    return Array.from(this.sampleProducts.keys());
  }
  
  /**
   * Clear all sample data
   */
  clearData(): void {
    this.sampleProducts.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a sample provider with default configuration
 */
export function createSampleProvider(overrides?: Partial<GdsnClientConfig>): SampleGdsnProvider {
  const config: GdsnClientConfig = {
    providerId: 'sample',
    baseUrl: 'https://api.sample-gdsn.example.com',
    subscriberGln: '0000000000000',
    auth: {
      type: 'api_key',
      apiKey: 'sample-api-key',
    },
    timeoutMs: 30000,
    maxRetries: 3,
    debug: false,
    ...overrides,
  };
  
  return new SampleGdsnProvider(config);
}

/**
 * Provider factory for dependency injection
 */
export type SampleProviderFactory = (config: GdsnClientConfig) => SampleGdsnProvider;

export const sampleProviderFactory: SampleProviderFactory = (config) => new SampleGdsnProvider(config);

