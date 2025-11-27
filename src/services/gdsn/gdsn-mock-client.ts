/**
 * GDSN Mock Client (GS1 Foundation - Phase 1)
 * 
 * Mock implementation of the GDSN client for development and testing.
 * Returns sample data for known GTINs and null for unknown ones.
 * 
 * TODO (Phase 2): Replace with real data pool client implementations
 */

import type {
  IGdsnClient,
  GdsnProductData,
  GdsnSubscriptionRequest,
} from './gdsn-client';
import logger from '@/lib/logger';

/**
 * Sample product data for testing
 * These are fictional products for development purposes
 */
const MOCK_PRODUCTS: Record<string, GdsnProductData> = {
  // Sample medical device
  '4006501003638': {
    gtin: '4006501003638',
    tradeItemDescription: 'Sterile Surgical Gloves (Size M)',
    brandName: 'MedPro',
    shortDescription: 'Latex-free sterile surgical gloves',
    manufacturerGln: '4006501000001',
    manufacturerName: 'MedPro Medical Supplies GmbH',
    gpcCategoryCode: '10000449',
    targetMarket: ['NL', 'DE', 'BE'],
    netContentValue: 50,
    netContentUom: 'pair',
    grossWeight: 0.5,
    grossWeightUom: 'kg',
    isRegulatedDevice: true,
    deviceRiskClass: 'IIa',
    udiDi: '(01)04006501003638',
    gmdnCode: '35370',
    packagingHierarchy: [
      {
        level: 'EACH',
        gtin: '4006501003638',
        childCount: 1,
        height: 25,
        width: 12,
        depth: 3,
        dimensionUom: 'cm',
        grossWeight: 0.01,
        weightUom: 'kg',
      },
      {
        level: 'CASE',
        gtin: '14006501003635',
        childCount: 50,
        height: 30,
        width: 40,
        depth: 25,
        dimensionUom: 'cm',
        grossWeight: 0.6,
        weightUom: 'kg',
      },
    ],
    digitalAssets: [
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://example.com/images/gloves-m-front.jpg',
        filename: 'gloves-m-front.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 1200,
        isPrimary: true,
        angle: 'front',
      },
    ],
    referencedDocuments: [
      {
        type: 'IFU',
        title: 'Instructions for Use - Surgical Gloves',
        language: 'en',
        url: 'https://example.com/docs/gloves-ifu-en.pdf',
        filename: 'gloves-ifu-en.pdf',
        effectiveDate: new Date('2023-01-01'),
        expirationDate: null,
        version: '2.1',
      },
      {
        type: 'CE_DECLARATION',
        title: 'EU Declaration of Conformity',
        language: 'en',
        url: 'https://example.com/docs/gloves-ce-declaration.pdf',
        filename: 'gloves-ce-declaration.pdf',
        effectiveDate: new Date('2023-06-01'),
        expirationDate: new Date('2028-06-01'),
        version: '1.0',
      },
    ],
    regulatoryInfo: {
      authority: 'EU_MDR',
      region: 'EU',
      status: 'COMPLIANT',
      certificateNumber: 'CE-2023-12345',
      registrationId: null,
      udiDi: '(01)04006501003638',
      udiPi: '(17)YYMMDD(10)BATCH',
      issuingAgency: 'GS1',
      issuedDate: new Date('2023-06-01'),
      expirationDate: new Date('2028-06-01'),
      notifiedBodyId: '0297',
      notifiedBodyName: 'BSI Group',
    },
    logisticsInfo: {
      storageTemp: '15-25°C',
      storageHumidity: '<80%',
      isHazardous: false,
      hazardClass: null,
      shelfLifeDays: 1825, // 5 years
      countryOfOrigin: 'MY',
      hsCode: '4015.11.00',
    },
    raw: {
      _mockData: true,
      _fetchedAt: new Date().toISOString(),
    },
  },
  
  // Sample pharmaceutical product
  '8714632012345': {
    gtin: '8714632012345',
    tradeItemDescription: 'Ibuprofen 400mg Tablets',
    brandName: 'PharmaCo',
    shortDescription: 'Pain relief tablets',
    manufacturerGln: '8714632000001',
    manufacturerName: 'PharmaCo B.V.',
    gpcCategoryCode: '51000000',
    targetMarket: ['NL'],
    netContentValue: 20,
    netContentUom: 'tablet',
    grossWeight: 0.03,
    grossWeightUom: 'kg',
    isRegulatedDevice: false,
    deviceRiskClass: null,
    udiDi: null,
    gmdnCode: null,
    packagingHierarchy: [
      {
        level: 'EACH',
        gtin: '8714632012345',
        childCount: 1,
        height: 8,
        width: 4,
        depth: 2,
        dimensionUom: 'cm',
        grossWeight: 0.03,
        weightUom: 'kg',
      },
    ],
    digitalAssets: [
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://example.com/images/ibuprofen-front.jpg',
        filename: 'ibuprofen-front.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 800,
        isPrimary: true,
        angle: 'front',
      },
    ],
    referencedDocuments: [
      {
        type: 'IFU',
        title: 'Patient Information Leaflet',
        language: 'nl',
        url: 'https://example.com/docs/ibuprofen-pil-nl.pdf',
        filename: 'ibuprofen-pil-nl.pdf',
        effectiveDate: new Date('2024-01-01'),
        expirationDate: null,
        version: '3.0',
      },
    ],
    regulatoryInfo: null,
    logisticsInfo: {
      storageTemp: '<25°C',
      storageHumidity: null,
      isHazardous: false,
      hazardClass: null,
      shelfLifeDays: 730, // 2 years
      countryOfOrigin: 'NL',
      hsCode: '3004.90.00',
    },
    raw: {
      _mockData: true,
      _fetchedAt: new Date().toISOString(),
    },
  },
};

/**
 * Mock GDSN Client
 * 
 * Use for development and testing. Returns sample data for known GTINs.
 */
export class GdsnMockClient implements IGdsnClient {
  readonly providerId = 'mock';
  
  private subscriptionCounter = 0;
  private subscriptions: Map<string, GdsnSubscriptionRequest> = new Map();
  
  async isConnected(): Promise<boolean> {
    // Mock is always "connected"
    return true;
  }
  
  async fetchProductByGtin(gtin: string): Promise<GdsnProductData | null> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'fetchProductByGtin',
      gtin,
    }, 'Mock GDSN lookup');
    
    // Simulate network delay
    await this.simulateDelay();
    
    // Return mock data if available
    const product = MOCK_PRODUCTS[gtin];
    
    if (product) {
      logger.info({
        module: 'GdsnMockClient',
        operation: 'fetchProductByGtin',
        gtin,
        found: true,
      }, 'Mock GDSN lookup - product found');
      
      return {
        ...product,
        raw: {
          ...product.raw,
          _fetchedAt: new Date().toISOString(),
        },
      };
    }
    
    logger.info({
      module: 'GdsnMockClient',
      operation: 'fetchProductByGtin',
      gtin,
      found: false,
    }, 'Mock GDSN lookup - product not found');
    
    return null;
  }
  
  async fetchProductsByGtins(gtins: string[]): Promise<Map<string, GdsnProductData | null>> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'fetchProductsByGtins',
      count: gtins.length,
    }, 'Mock GDSN batch lookup');
    
    const results = new Map<string, GdsnProductData | null>();
    
    for (const gtin of gtins) {
      const product = await this.fetchProductByGtin(gtin);
      results.set(gtin, product);
    }
    
    return results;
  }
  
  async searchProducts(query: {
    gpcCategory?: string;
    manufacturerGln?: string;
    targetMarket?: string;
    limit?: number;
  }): Promise<GdsnProductData[]> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'searchProducts',
      query,
    }, 'Mock GDSN search');
    
    await this.simulateDelay();
    
    let results = Object.values(MOCK_PRODUCTS);
    
    if (query.gpcCategory) {
      results = results.filter(p => p.gpcCategoryCode === query.gpcCategory);
    }
    
    if (query.manufacturerGln) {
      results = results.filter(p => p.manufacturerGln === query.manufacturerGln);
    }
    
    if (query.targetMarket) {
      results = results.filter(p => p.targetMarket.includes(query.targetMarket!));
    }
    
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  async createSubscription(request: GdsnSubscriptionRequest): Promise<string> {
    logger.info({
      module: 'GdsnMockClient',
      operation: 'createSubscription',
      request,
    }, 'Mock subscription created');
    
    await this.simulateDelay();
    
    this.subscriptionCounter++;
    const subscriptionId = `mock-sub-${this.subscriptionCounter}-${Date.now()}`;
    this.subscriptions.set(subscriptionId, request);
    
    return subscriptionId;
  }
  
  async cancelSubscription(subscriptionId: string): Promise<void> {
    logger.info({
      module: 'GdsnMockClient',
      operation: 'cancelSubscription',
      subscriptionId,
    }, 'Mock subscription cancelled');
    
    await this.simulateDelay();
    
    this.subscriptions.delete(subscriptionId);
  }
  
  async verifyGtin(gtin: string): Promise<boolean> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'verifyGtin',
      gtin,
    }, 'Mock GTIN verification');
    
    await this.simulateDelay();
    
    // Mock: only known GTINs are "verified"
    return gtin in MOCK_PRODUCTS;
  }
  
  /**
   * Simulate network delay for realistic testing
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Helper: Get list of mock GTINs for testing
   */
  getMockGtins(): string[] {
    return Object.keys(MOCK_PRODUCTS);
  }
  
  /**
   * Helper: Add custom mock product for testing
   */
  addMockProduct(product: GdsnProductData): void {
    MOCK_PRODUCTS[product.gtin] = product;
  }
}

// Singleton instance
let mockClientInstance: GdsnMockClient | null = null;

export function getGdsnMockClient(): GdsnMockClient {
  if (!mockClientInstance) {
    mockClientInstance = new GdsnMockClient();
  }
  return mockClientInstance;
}

