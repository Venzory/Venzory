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
  GdsnFetchBatchOptions,
  GdsnPaginatedResponse,
  GdsnListChangesOptions,
  GdsnCinMessage,
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

  // Sample medical device - Disposable Syringes
  '5901234567890': {
    gtin: '5901234567890',
    tradeItemDescription: 'Disposable Syringes 5ml Luer Lock',
    brandName: 'MediSafe',
    shortDescription: 'Sterile single-use syringes with Luer lock',
    manufacturerGln: '5901234000001',
    manufacturerName: 'MediSafe Medical Devices Sp. z o.o.',
    gpcCategoryCode: '10000449',
    targetMarket: ['NL', 'DE', 'PL', 'BE'],
    netContentValue: 100,
    netContentUom: 'piece',
    grossWeight: 0.8,
    grossWeightUom: 'kg',
    isRegulatedDevice: true,
    deviceRiskClass: 'I',
    udiDi: '(01)05901234567890',
    gmdnCode: '47017',
    packagingHierarchy: [
      {
        level: 'EACH',
        gtin: '5901234567890',
        childCount: 1,
        height: 15,
        width: 2,
        depth: 2,
        dimensionUom: 'cm',
        grossWeight: 0.008,
        weightUom: 'kg',
      },
      {
        level: 'INNER_PACK',
        gtin: '15901234567897',
        childCount: 10,
        height: 16,
        width: 8,
        depth: 5,
        dimensionUom: 'cm',
        grossWeight: 0.09,
        weightUom: 'kg',
      },
      {
        level: 'CASE',
        gtin: '25901234567894',
        childCount: 100,
        height: 35,
        width: 30,
        depth: 25,
        dimensionUom: 'cm',
        grossWeight: 1.0,
        weightUom: 'kg',
      },
    ],
    digitalAssets: [
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://example.com/images/syringe-5ml-front.jpg',
        filename: 'syringe-5ml-front.jpg',
        mimeType: 'image/jpeg',
        width: 1000,
        height: 1000,
        isPrimary: true,
        angle: 'front',
      },
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://example.com/images/syringe-5ml-detail.jpg',
        filename: 'syringe-5ml-detail.jpg',
        mimeType: 'image/jpeg',
        width: 1000,
        height: 1000,
        isPrimary: false,
        angle: 'detail',
      },
    ],
    referencedDocuments: [
      {
        type: 'IFU',
        title: 'Instructions for Use - Disposable Syringes',
        language: 'en',
        url: 'https://example.com/docs/syringe-ifu-en.pdf',
        filename: 'syringe-ifu-en.pdf',
        effectiveDate: new Date('2024-01-15'),
        expirationDate: null,
        version: '1.2',
      },
      {
        type: 'CE_DECLARATION',
        title: 'EU Declaration of Conformity - Syringes',
        language: 'en',
        url: 'https://example.com/docs/syringe-ce-declaration.pdf',
        filename: 'syringe-ce-declaration.pdf',
        effectiveDate: new Date('2024-02-01'),
        expirationDate: new Date('2029-02-01'),
        version: '1.0',
      },
      {
        type: 'SDS',
        title: 'Safety Data Sheet',
        language: 'en',
        url: 'https://example.com/docs/syringe-sds-en.pdf',
        filename: 'syringe-sds-en.pdf',
        effectiveDate: new Date('2024-01-01'),
        expirationDate: null,
        version: '2.0',
      },
    ],
    regulatoryInfo: {
      authority: 'EU_MDR',
      region: 'EU',
      status: 'COMPLIANT',
      certificateNumber: 'CE-2024-SYR-001',
      registrationId: 'EUDAMED-2024-001234',
      udiDi: '(01)05901234567890',
      udiPi: '(17)YYMMDD(10)LOT(21)SN',
      issuingAgency: 'GS1',
      issuedDate: new Date('2024-02-01'),
      expirationDate: new Date('2029-02-01'),
      notifiedBodyId: '0123',
      notifiedBodyName: 'TÜV SÜD',
    },
    logisticsInfo: {
      storageTemp: '5-30°C',
      storageHumidity: '<70%',
      isHazardous: false,
      hazardClass: null,
      shelfLifeDays: 1825, // 5 years
      countryOfOrigin: 'PL',
      hsCode: '9018.31.10',
    },
    raw: {
      _mockData: true,
      _fetchedAt: new Date().toISOString(),
    },
  },

  // Sample medical device - Adhesive Wound Dressing
  '4260123456789': {
    gtin: '4260123456789',
    tradeItemDescription: 'Adhesive Wound Dressing 10x10cm Sterile',
    brandName: 'WoundCare Pro',
    shortDescription: 'Self-adhesive sterile wound dressing with absorbent pad',
    manufacturerGln: '4260123000001',
    manufacturerName: 'WoundCare Pro GmbH',
    gpcCategoryCode: '10000449',
    targetMarket: ['NL', 'DE', 'AT', 'CH'],
    netContentValue: 25,
    netContentUom: 'piece',
    grossWeight: 0.15,
    grossWeightUom: 'kg',
    isRegulatedDevice: true,
    deviceRiskClass: 'I',
    udiDi: '(01)04260123456789',
    gmdnCode: '47738',
    packagingHierarchy: [
      {
        level: 'EACH',
        gtin: '4260123456789',
        childCount: 1,
        height: 12,
        width: 12,
        depth: 0.3,
        dimensionUom: 'cm',
        grossWeight: 0.006,
        weightUom: 'kg',
      },
      {
        level: 'CASE',
        gtin: '14260123456786',
        childCount: 25,
        height: 15,
        width: 15,
        depth: 10,
        dimensionUom: 'cm',
        grossWeight: 0.2,
        weightUom: 'kg',
      },
    ],
    digitalAssets: [
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://example.com/images/wound-dressing-front.jpg',
        filename: 'wound-dressing-front.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 800,
        isPrimary: true,
        angle: 'front',
      },
      {
        type: 'MARKETING_IMAGE',
        url: 'https://example.com/images/wound-dressing-application.jpg',
        filename: 'wound-dressing-application.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 800,
        isPrimary: false,
        angle: null,
      },
    ],
    referencedDocuments: [
      {
        type: 'IFU',
        title: 'Instructions for Use - Wound Dressing',
        language: 'de',
        url: 'https://example.com/docs/dressing-ifu-de.pdf',
        filename: 'dressing-ifu-de.pdf',
        effectiveDate: new Date('2023-06-01'),
        expirationDate: null,
        version: '3.1',
      },
      {
        type: 'IFU',
        title: 'Instructions for Use - Wound Dressing',
        language: 'en',
        url: 'https://example.com/docs/dressing-ifu-en.pdf',
        filename: 'dressing-ifu-en.pdf',
        effectiveDate: new Date('2023-06-01'),
        expirationDate: null,
        version: '3.1',
      },
      {
        type: 'CE_DECLARATION',
        title: 'EU Declaration of Conformity',
        language: 'en',
        url: 'https://example.com/docs/dressing-ce-declaration.pdf',
        filename: 'dressing-ce-declaration.pdf',
        effectiveDate: new Date('2023-01-15'),
        expirationDate: new Date('2028-01-15'),
        version: '2.0',
      },
    ],
    regulatoryInfo: {
      authority: 'EU_MDR',
      region: 'EU',
      status: 'COMPLIANT',
      certificateNumber: 'CE-2023-WND-789',
      registrationId: null,
      udiDi: '(01)04260123456789',
      udiPi: '(17)YYMMDD(10)BATCH',
      issuingAgency: 'GS1',
      issuedDate: new Date('2023-01-15'),
      expirationDate: new Date('2028-01-15'),
      notifiedBodyId: '0481',
      notifiedBodyName: 'DEKRA',
    },
    logisticsInfo: {
      storageTemp: '10-25°C',
      storageHumidity: '<60%',
      isHazardous: false,
      hazardClass: null,
      shelfLifeDays: 1095, // 3 years
      countryOfOrigin: 'DE',
      hsCode: '3005.10.00',
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
  
  async fetchProductBatch(options: GdsnFetchBatchOptions): Promise<GdsnPaginatedResponse<GdsnProductData>> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'fetchProductBatch',
      options,
    }, 'Mock GDSN batch fetch');
    
    await this.simulateDelay();
    
    let products = Object.values(MOCK_PRODUCTS);
    
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
    // Note: modifiedSince filter would require tracking modification dates in mock data
    
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
  
  async listChanges(options: GdsnListChangesOptions): Promise<GdsnPaginatedResponse<GdsnCinMessage>> {
    logger.debug({
      module: 'GdsnMockClient',
      operation: 'listChanges',
      options,
    }, 'Mock GDSN list changes');
    
    await this.simulateDelay();
    
    // Generate mock CIN messages for all known products
    // In a real implementation, this would track actual changes
    const mockChanges: GdsnCinMessage[] = Object.keys(MOCK_PRODUCTS).map((gtin, index) => ({
      messageId: `mock-cin-${index + 1}-${Date.now()}`,
      gtin,
      sourceGln: MOCK_PRODUCTS[gtin].manufacturerGln || '0000000000000',
      changeType: 'ADD' as const,
      effectiveDate: options.since,
      timestamp: new Date(),
    }));
    
    // Filter by change type if specified
    let filteredChanges = mockChanges;
    if (options.changeTypes && options.changeTypes.length > 0) {
      filteredChanges = mockChanges.filter(c => options.changeTypes!.includes(c.changeType));
    }
    
    // Apply pagination
    const page = options.pagination?.page ?? 1;
    const pageSize = Math.min(options.pagination?.pageSize ?? 100, 1000);
    const totalCount = filteredChanges.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = filteredChanges.slice(startIndex, startIndex + pageSize);
    
    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
  
  async listSubscriptions(): Promise<string[]> {
    return Array.from(this.subscriptions.keys());
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

