/**
 * GDSN Services (GS1 Foundation - Phase 6)
 * 
 * This module provides GDSN (Global Data Synchronization Network) integration
 * for product data enrichment from GS1 data pools.
 * 
 * @see docs/gs1/GDSN_PROVIDER_BLUEPRINT.md for provider implementation guide
 */

// ============================================================================
// Client Interface & Domain Types
// ============================================================================

export type {
  // Core interface
  IGdsnClient,
  GdsnClientFactory,
  
  // Configuration
  GdsnClientConfig,
  GdsnAuthConfig,
  
  // Pagination
  GdsnPaginationOptions,
  GdsnPaginatedResponse,
  GdsnFetchBatchOptions,
  GdsnListChangesOptions,
  
  // Domain types
  GdsnProductData,
  GdsnPackagingData,
  GdsnMediaData,
  GdsnDocumentData,
  GdsnRegulatoryData,
  GdsnLogisticsData,
  GdsnSubscriptionRequest,
  GdsnCinMessage,
  
  // Error types
  GdsnErrorCode,
} from './gdsn-client';

export {
  // Error classes
  GdsnError,
  GdsnAuthenticationError,
  GdsnRateLimitError,
  GdsnNetworkError,
  GdsnValidationError,
} from './gdsn-client';

// ============================================================================
// Provider Types (for implementing custom providers)
// ============================================================================

export type {
  ProviderRawResponse,
  ProviderTradeItem,
  ProviderParty,
  ProviderTradeItemDescription,
  ProviderLanguageString,
  ProviderClassification,
  ProviderTargetMarket,
  ProviderMeasurement,
  ProviderMeasurements,
  ProviderHealthcareInfo,
  ProviderPackaging,
  ProviderReferencedFile,
  ProviderRegulatoryInfo,
  ProviderHandlingInfo,
  ProviderAdditionalId,
  ProviderCinMessage,
  OneWorldSyncExtensions,
  SyndigoExtensions,
  Gs1GoExtensions,
} from './types';

// ============================================================================
// Mappers (for parsing provider responses)
// ============================================================================

export {
  parseGdsnXmlResponse,
  parseGdsnJsonResponse,
  mapToGdsnProductData,
  mapToCinMessage,
} from './mappers';

// ============================================================================
// Providers
// ============================================================================

export {
  // Mock client (for development/testing)
  GdsnMockClient,
  getGdsnMockClient,
} from './gdsn-mock-client';

export {
  // Sample provider (demonstrates implementation pattern)
  SampleGdsnProvider,
  createSampleProvider,
  sampleProviderFactory,
  type SampleProviderFactory,
} from './providers';

// ============================================================================
// High-Level Service
// ============================================================================

export {
  GdsnService,
  getGdsnService,
  type GdsnLookupResult,
} from './gdsn-service';

// ============================================================================
// Sample Data (for testing)
// ============================================================================

export {
  SAMPLE_XML_MEDICAL_DEVICE,
  SAMPLE_JSON_MEDICAL_DEVICE,
  SAMPLE_CIN_MESSAGES,
  loadXmlSample,
  loadJsonSample,
} from './samples';
