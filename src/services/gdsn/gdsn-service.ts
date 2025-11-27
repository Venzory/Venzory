/**
 * GDSN Service (GS1 Foundation - Phase 1)
 * 
 * High-level service for GDSN operations.
 * Uses the GDSN client for data pool communication and repositories for persistence.
 */

import type { IGdsnClient, GdsnProductData, GdsnSubscriptionRequest } from './gdsn-client';
import { getGdsnMockClient } from './gdsn-mock-client';
import { SubscriptionRepository } from '@/src/repositories/gdsn';
import logger from '@/lib/logger';

export interface GdsnLookupResult {
  found: boolean;
  gtin: string;
  data: GdsnProductData | null;
  source: 'cache' | 'network';
  timestamp: Date;
}

export class GdsnService {
  private client: IGdsnClient;
  private subscriptionRepo: SubscriptionRepository;
  
  constructor(
    client?: IGdsnClient,
    subscriptionRepo?: SubscriptionRepository
  ) {
    // Default to mock client for Phase 1
    // TODO (Phase 2): Inject real client based on configuration
    this.client = client ?? getGdsnMockClient();
    this.subscriptionRepo = subscriptionRepo ?? new SubscriptionRepository();
  }
  
  /**
   * Get the current client provider ID
   */
  getProviderId(): string {
    return this.client.providerId;
  }
  
  /**
   * Check if connected to GDSN
   */
  async isConnected(): Promise<boolean> {
    return this.client.isConnected();
  }
  
  /**
   * Lookup product by GTIN from GDSN
   */
  async lookupByGtin(gtin: string): Promise<GdsnLookupResult> {
    logger.info({
      module: 'GdsnService',
      operation: 'lookupByGtin',
      gtin,
      provider: this.client.providerId,
    }, 'Looking up GTIN in GDSN');
    
    try {
      const data = await this.client.fetchProductByGtin(gtin);
      
      return {
        found: data !== null,
        gtin,
        data,
        source: 'network',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({
        module: 'GdsnService',
        operation: 'lookupByGtin',
        gtin,
        error: error instanceof Error ? error.message : String(error),
      }, 'GDSN lookup failed');
      
      return {
        found: false,
        gtin,
        data: null,
        source: 'network',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Batch lookup multiple GTINs
   */
  async lookupByGtins(gtins: string[]): Promise<Map<string, GdsnLookupResult>> {
    logger.info({
      module: 'GdsnService',
      operation: 'lookupByGtins',
      count: gtins.length,
      provider: this.client.providerId,
    }, 'Batch GDSN lookup');
    
    const results = new Map<string, GdsnLookupResult>();
    
    try {
      const data = await this.client.fetchProductsByGtins(gtins);
      
      for (const [gtin, productData] of data.entries()) {
        results.set(gtin, {
          found: productData !== null,
          gtin,
          data: productData,
          source: 'network',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error({
        module: 'GdsnService',
        operation: 'lookupByGtins',
        count: gtins.length,
        error: error instanceof Error ? error.message : String(error),
      }, 'Batch GDSN lookup failed');
      
      // Return empty results for all GTINs
      for (const gtin of gtins) {
        results.set(gtin, {
          found: false,
          gtin,
          data: null,
          source: 'network',
          timestamp: new Date(),
        });
      }
    }
    
    return results;
  }
  
  /**
   * Verify if a GTIN exists in GDSN
   */
  async verifyGtin(gtin: string): Promise<boolean> {
    logger.debug({
      module: 'GdsnService',
      operation: 'verifyGtin',
      gtin,
    }, 'Verifying GTIN');
    
    return this.client.verifyGtin(gtin);
  }
  
  /**
   * Create a GDSN subscription
   */
  async createSubscription(
    request: GdsnSubscriptionRequest,
    notes?: string
  ): Promise<{ subscriptionId: string; dbId: string }> {
    logger.info({
      module: 'GdsnService',
      operation: 'createSubscription',
      request,
    }, 'Creating GDSN subscription');
    
    // Create subscription with data pool
    const subscriptionId = await this.client.createSubscription(request);
    
    // Persist to database
    const subscription = await this.subscriptionRepo.create({
      dataPoolId: this.client.providerId,
      subscriptionId,
      targetGln: request.targetGln,
      sourceGln: request.sourceGln,
      gpcCategory: request.gpcCategory,
      targetMarket: request.targetMarket,
      status: 'PENDING',
      notes,
    });
    
    logger.info({
      module: 'GdsnService',
      operation: 'createSubscription',
      subscriptionId,
      dbId: subscription.id,
    }, 'GDSN subscription created');
    
    return {
      subscriptionId,
      dbId: subscription.id,
    };
  }
  
  /**
   * Cancel a GDSN subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    logger.info({
      module: 'GdsnService',
      operation: 'cancelSubscription',
      subscriptionId,
    }, 'Cancelling GDSN subscription');
    
    // Cancel with data pool
    await this.client.cancelSubscription(subscriptionId);
    
    // Update database
    const subscription = await this.subscriptionRepo.findBySubscriptionId(subscriptionId);
    if (subscription) {
      await this.subscriptionRepo.cancel(subscription.id);
    }
    
    logger.info({
      module: 'GdsnService',
      operation: 'cancelSubscription',
      subscriptionId,
    }, 'GDSN subscription cancelled');
  }
  
  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string) {
    return this.subscriptionRepo.findBySubscriptionId(subscriptionId);
  }
  
  /**
   * Get all active subscriptions
   */
  async getActiveSubscriptions() {
    return this.subscriptionRepo.findActive();
  }
  
  /**
   * Search products in GDSN
   */
  async searchProducts(query: {
    gpcCategory?: string;
    manufacturerGln?: string;
    targetMarket?: string;
    limit?: number;
  }): Promise<GdsnProductData[]> {
    logger.debug({
      module: 'GdsnService',
      operation: 'searchProducts',
      query,
    }, 'Searching GDSN products');
    
    return this.client.searchProducts(query);
  }
}

// Singleton instance
let gdsnServiceInstance: GdsnService | null = null;

export function getGdsnService(): GdsnService {
  if (!gdsnServiceInstance) {
    gdsnServiceInstance = new GdsnService();
  }
  return gdsnServiceInstance;
}

