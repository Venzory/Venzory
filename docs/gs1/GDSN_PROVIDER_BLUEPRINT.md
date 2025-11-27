# GDSN Provider Blueprint

This document describes how to implement a GDSN (Global Data Synchronization Network) provider for Zenvory. Use this guide when integrating with real data pools like 1WorldSync, Syndigo, or GS1 GO.

## Table of Contents

1. [Overview](#overview)
2. [Data Flow](#data-flow)
3. [IGdsnClient Contract](#igdsnclient-contract)
4. [Configuration](#configuration)
5. [Mapping Pipeline](#mapping-pipeline)
6. [Implementation Checklist](#implementation-checklist)
7. [Error Handling](#error-handling)
8. [Sample Responses](#sample-responses)
9. [Testing](#testing)

---

## Overview

The GDSN integration layer enables Zenvory to synchronize product master data from GS1 data pools. The architecture is designed to:

- Support multiple GDSN providers through a common interface
- Parse both XML (GS1 XML 3.1) and JSON response formats
- Map provider-specific responses to unified domain types
- Handle pagination, error recovery, and rate limiting
- Support both real-time lookups and batch synchronization

### Current Providers

| Provider | Status | Description |
|----------|--------|-------------|
| `mock` | ✅ Ready | Mock provider for development/testing |
| `sample` | ✅ Ready | Sample provider demonstrating XML/JSON parsing |
| `1worldsync` | 🔲 Planned | 1WorldSync Content1 data pool |
| `syndigo` | 🔲 Planned | Syndigo data pool |
| `gs1go` | 🔲 Planned | GS1 GO verification service |

---

## Data Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│  Provider API   │ --> │  ProviderRawResponse │ --> │  GdsnProductData  │
│  (XML or JSON)  │     │  (Provider Types)    │     │  (Domain Types)   │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
         │                        │                           │
         │                        │                           │
         v                        v                           v
   HTTP Response           parseGdsnXmlResponse       mapToGdsnProductData
   from data pool          parseGdsnJsonResponse      (gdsn-mapper.ts)
                           (gdsn-mapper.ts)
                                                             │
                                                             │
                                                             v
                                                   ┌───────────────────┐
                                                   │   Prisma Models   │
                                                   │   (Database)      │
                                                   └───────────────────┘
                                                             │
                                                             │
                                                             v
                                                   ProductEnrichmentService
                                                   (product-enrichment-service.ts)
```

### Layer Responsibilities

1. **Provider API Layer**: HTTP communication with data pool
2. **Provider Types Layer**: Raw response parsing (XML/JSON → structured types)
3. **Domain Types Layer**: Unified product representation
4. **Persistence Layer**: Prisma models and repositories

---

## IGdsnClient Contract

Every provider must implement the `IGdsnClient` interface:

```typescript
interface IGdsnClient {
  // Identity
  readonly providerId: string;
  readonly config?: GdsnClientConfig;
  
  // Connection
  isConnected(): Promise<boolean>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  
  // Product Retrieval
  fetchProductByGtin(gtin: string): Promise<GdsnProductData | null>;
  fetchProductsByGtins(gtins: string[]): Promise<Map<string, GdsnProductData | null>>;
  fetchProductBatch(options: GdsnFetchBatchOptions): Promise<GdsnPaginatedResponse<GdsnProductData>>;
  searchProducts(query: SearchQuery): Promise<GdsnProductData[]>;
  verifyGtin(gtin: string): Promise<boolean>;
  
  // Change Notifications
  listChanges(options: GdsnListChangesOptions): Promise<GdsnPaginatedResponse<GdsnCinMessage>>;
  
  // Subscriptions
  createSubscription(request: GdsnSubscriptionRequest): Promise<string>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  listSubscriptions?(): Promise<string[]>;
}
```

### Key Methods

#### `fetchProductByGtin(gtin)`

Fetches a single product by GTIN. Returns `null` if not found.

```typescript
const product = await provider.fetchProductByGtin('04006501003638');
if (product) {
  console.log(product.tradeItemDescription);
  console.log(product.brandName);
}
```

#### `fetchProductBatch(options)`

Fetches products with pagination. Use for bulk synchronization.

```typescript
const response = await provider.fetchProductBatch({
  targetMarket: 'NL',
  modifiedSince: new Date('2024-01-01'),
  pagination: { page: 1, pageSize: 100 },
});

console.log(`Page ${response.page} of ${response.totalPages}`);
for (const product of response.items) {
  // Process product
}
```

#### `listChanges(options)`

Fetches Change In Notification (CIN) messages for incremental sync.

```typescript
const changes = await provider.listChanges({
  since: new Date('2024-11-01'),
  changeTypes: ['ADD', 'CHANGE'],
  pagination: { pageSize: 500 },
});

for (const cin of changes.items) {
  if (cin.changeType === 'DELETE') {
    // Mark product as discontinued
  } else {
    // Fetch and update product
    const product = await provider.fetchProductByGtin(cin.gtin);
  }
}
```

---

## Configuration

### GdsnClientConfig

```typescript
interface GdsnClientConfig {
  providerId: string;           // e.g., "1worldsync", "syndigo"
  baseUrl: string;              // Provider API base URL
  subscriberGln: string;        // Your organization's GLN
  auth: GdsnAuthConfig;         // Authentication credentials
  timeoutMs?: number;           // Request timeout (default: 30000)
  maxRetries?: number;          // Max retry attempts (default: 3)
  debug?: boolean;              // Enable debug logging
  headers?: Record<string, string>;  // Custom headers
}
```

### Authentication Types

```typescript
interface GdsnAuthConfig {
  type: 'api_key' | 'oauth2' | 'basic';
  
  // For api_key
  apiKey?: string;
  
  // For oauth2
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  
  // For basic
  username?: string;
  password?: string;
}
```

### Environment Variables

When implementing a real provider, use environment variables:

```env
# 1WorldSync
GDSN_1WORLDSYNC_BASE_URL=https://api.1worldsync.com
GDSN_1WORLDSYNC_API_KEY=your-api-key
GDSN_1WORLDSYNC_GLN=your-gln

# Syndigo
GDSN_SYNDIGO_BASE_URL=https://api.syndigo.com
GDSN_SYNDIGO_CLIENT_ID=your-client-id
GDSN_SYNDIGO_CLIENT_SECRET=your-client-secret
GDSN_SYNDIGO_TOKEN_URL=https://auth.syndigo.com/oauth/token
GDSN_SYNDIGO_GLN=your-gln
```

---

## Mapping Pipeline

### Step 1: Parse Raw Response

Use the appropriate parser based on response format:

```typescript
import { parseGdsnXmlResponse, parseGdsnJsonResponse } from '@/src/services/gdsn';

// For XML responses (GS1 XML 3.1)
const xmlRaw = parseGdsnXmlResponse(xmlString, 'provider-id');

// For JSON responses
const jsonRaw = parseGdsnJsonResponse(jsonData, 'provider-id');
```

### Step 2: Map to Domain Types

Convert the raw response to unified domain types:

```typescript
import { mapToGdsnProductData } from '@/src/services/gdsn';

const product: GdsnProductData = mapToGdsnProductData(rawResponse);
```

### Step 3: Enrich Product (via ProductEnrichmentService)

The `ProductEnrichmentService` handles mapping from `GdsnProductData` to Prisma models:

| GdsnProductData Field | Prisma Model | Field |
|----------------------|--------------|-------|
| `tradeItemDescription` | `Product` | `name` |
| `brandName` | `Product` | `brand` |
| `shortDescription` | `Product` | `shortDescription` |
| `manufacturerGln` | `Product` | `manufacturerGln` |
| `manufacturerName` | `Product` | `manufacturerName` |
| `gpcCategoryCode` | `Product` | `tradeItemClassification` |
| `targetMarket` | `Product` | `targetMarket` |
| `isRegulatedDevice` | `Product` | `isRegulatedDevice` |
| `deviceRiskClass` | `Product` | `deviceRiskClass` |
| `udiDi` | `Product` | `udiDi` |
| `gmdnCode` | `Product` | `gmdnCode` |
| `packagingHierarchy` | `ProductPackaging` | (multiple records) |
| `digitalAssets` | `ProductMedia` | (multiple records) |
| `referencedDocuments` | `ProductDocument` | (multiple records) |
| `regulatoryInfo` | `ProductRegulatory` | (single record) |
| `logisticsInfo` | `ProductLogistics` | (single record) |

---

## Implementation Checklist

Use this checklist when implementing a new provider:

### Prerequisites

- [ ] Obtain GS1 membership and GLN for your organization
- [ ] Sign data pool agreement with provider
- [ ] Obtain API credentials (API key, OAuth2 credentials, etc.)
- [ ] Review provider's API documentation

### Implementation Steps

- [ ] Create provider class file: `src/services/gdsn/providers/{provider}-provider.ts`
- [ ] Implement `IGdsnClient` interface
- [ ] Add provider-specific response parsing (if needed)
- [ ] Add configuration validation
- [ ] Implement authentication flow
- [ ] Implement rate limiting/retry logic
- [ ] Add provider to index exports
- [ ] Write unit tests
- [ ] Write integration tests (with sandbox/test environment)
- [ ] Document provider-specific configuration

### Provider Class Template

```typescript
import type {
  IGdsnClient,
  GdsnClientConfig,
  GdsnProductData,
  // ... other types
} from '../gdsn-client';
import {
  parseGdsnXmlResponse,  // or parseGdsnJsonResponse
  mapToGdsnProductData,
} from '../mappers';

export class MyProvider implements IGdsnClient {
  readonly providerId = 'myprovider';
  readonly config: GdsnClientConfig;
  
  private accessToken?: string;
  private tokenExpiry?: Date;
  
  constructor(config: GdsnClientConfig) {
    this.config = config;
    this.validateConfig();
  }
  
  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new GdsnError('baseUrl is required', 'CONFIGURATION_ERROR');
    }
    // ... validate other required fields
  }
  
  async connect(): Promise<void> {
    // Implement authentication
    // For OAuth2: exchange credentials for access token
    // For API key: validate key
  }
  
  async fetchProductByGtin(gtin: string): Promise<GdsnProductData | null> {
    await this.ensureAuthenticated();
    
    const response = await this.httpClient.get(
      `${this.config.baseUrl}/products/${gtin}`
    );
    
    if (response.status === 404) {
      return null;
    }
    
    // Parse response based on content type
    const raw = parseGdsnXmlResponse(response.data, this.providerId);
    return mapToGdsnProductData(raw);
  }
  
  // ... implement other methods
}
```

---

## Error Handling

### Error Types

```typescript
// Base error
throw new GdsnError('Something went wrong', 'PROVIDER_ERROR', providerId, { details });

// Authentication failed
throw new GdsnAuthenticationError('Invalid credentials', providerId);

// Rate limit exceeded
throw new GdsnRateLimitError('Too many requests', retryAfterMs, providerId);

// Network/connectivity error
throw new GdsnNetworkError('Connection timeout', providerId);

// Invalid response data
throw new GdsnValidationError('Invalid XML', providerId, { xml: snippet });
```

### Error Codes

| Code | Description | Recommended Action |
|------|-------------|-------------------|
| `AUTHENTICATION_ERROR` | Invalid credentials | Check API key/credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions | Verify subscription/permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `NETWORK_ERROR` | Connection failed | Retry with backoff |
| `TIMEOUT_ERROR` | Request timed out | Retry with longer timeout |
| `VALIDATION_ERROR` | Invalid response | Log and investigate |
| `NOT_FOUND` | Resource not found | Handle gracefully |
| `PROVIDER_ERROR` | Provider-side error | Log and retry |
| `CONFIGURATION_ERROR` | Invalid config | Fix configuration |

### Retry Strategy

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof GdsnRateLimitError) {
        await sleep(error.retryAfterMs ?? 1000 * attempt);
      } else if (error instanceof GdsnNetworkError) {
        await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
      } else {
        throw error; // Don't retry other errors
      }
    }
  }
  
  throw lastError;
}
```

---

## Sample Responses

### GS1 XML 3.1 (Medical Device)

See: `src/services/gdsn/samples/sample-medical-device.xml`

Key elements:
- `<gtin>` - Product GTIN
- `<tradeItemDescriptionInformation>` - Product descriptions
- `<healthcareItemInformation>` - Medical device data
- `<packagingInformation>` - Packaging hierarchy
- `<referencedFileInformation>` - Images and documents

### JSON Format

See: `src/services/gdsn/samples/sample-medical-device.json`

The JSON format mirrors the XML structure but uses camelCase property names.

### CIN Messages

See: `src/services/gdsn/samples/sample-cin-message.json`

Change In Notification messages include:
- `catalogueItemState`: ADD, CHANGE, DELETE, CORRECT
- `effectiveDateTime`: When the change takes effect
- `gtin`: Affected product GTIN

---

## Testing

### Unit Tests

Test the mapper functions:

```typescript
import { parseGdsnXmlResponse, mapToGdsnProductData } from '@/src/services/gdsn';
import { SAMPLE_XML_MEDICAL_DEVICE } from '@/src/services/gdsn/samples';

describe('GDSN Mapper', () => {
  it('should parse XML sample', () => {
    const raw = parseGdsnXmlResponse(SAMPLE_XML_MEDICAL_DEVICE, 'test');
    expect(raw.tradeItem.gtin).toBe('04006501003638');
  });
  
  it('should map to domain types', () => {
    const raw = parseGdsnXmlResponse(SAMPLE_XML_MEDICAL_DEVICE, 'test');
    const product = mapToGdsnProductData(raw);
    
    expect(product.gtin).toBe('04006501003638');
    expect(product.brandName).toBe('MedPro');
    expect(product.isRegulatedDevice).toBe(true);
  });
});
```

### Integration Tests

Test with the sample provider:

```typescript
import { createSampleProvider } from '@/src/services/gdsn';

describe('Sample Provider', () => {
  const provider = createSampleProvider();
  
  beforeAll(async () => {
    await provider.connect();
  });
  
  it('should fetch product by GTIN', async () => {
    const product = await provider.fetchProductByGtin('04006501003638');
    expect(product).not.toBeNull();
    expect(product?.brandName).toBe('MedPro');
  });
  
  it('should handle unknown GTIN', async () => {
    const product = await provider.fetchProductByGtin('00000000000000');
    expect(product).toBeNull();
  });
  
  it('should list changes', async () => {
    const changes = await provider.listChanges({
      since: new Date('2024-01-01'),
    });
    expect(changes.items.length).toBeGreaterThan(0);
  });
});
```

### Sandbox Testing

When testing with a real provider, use their sandbox/test environment:

1. Obtain sandbox credentials from provider
2. Configure provider with sandbox base URL
3. Use test GTINs provided by the sandbox
4. Verify response parsing and mapping

---

## File Structure

```
src/services/gdsn/
├── gdsn-client.ts          # IGdsnClient interface & domain types
├── gdsn-mock-client.ts     # Mock implementation for dev/testing
├── gdsn-service.ts         # High-level GDSN service
├── index.ts                # Module exports
├── mappers/
│   ├── gdsn-mapper.ts      # XML/JSON parsing & mapping
│   └── index.ts
├── providers/
│   ├── sample-provider.ts  # Sample provider implementation
│   └── index.ts
├── samples/
│   ├── sample-medical-device.xml
│   ├── sample-medical-device.json
│   ├── sample-cin-message.json
│   └── index.ts
└── types/
    ├── provider-response.ts # Provider-specific types
    └── index.ts
```

---

## Related Documentation

- [GS1 Foundation Implementation](./GS1_FOUNDATION_IMPLEMENTATION.md)
- [GS1 Product Master Architecture](../../gs1-product-master-architecture.plan.md)
- [Product Data Backbone](../PRODUCT_DATA_BACKBONE.md)

## External Resources

- [GS1 GDSN Standards](https://www.gs1.org/standards/gdsn)
- [GS1 XML 3.1 Schema](https://www.gs1.org/standards/gdsn/3-1)
- [1WorldSync Documentation](https://developers.1worldsync.com/)
- [Syndigo API Documentation](https://developer.syndigo.com/)

