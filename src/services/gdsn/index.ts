/**
 * GDSN Services (GS1 Foundation - Phase 1)
 */

export type {
  IGdsnClient,
  GdsnProductData,
  GdsnPackagingData,
  GdsnMediaData,
  GdsnDocumentData,
  GdsnRegulatoryData,
  GdsnLogisticsData,
  GdsnSubscriptionRequest,
  GdsnCinMessage,
} from './gdsn-client';

export { GdsnMockClient, getGdsnMockClient } from './gdsn-mock-client';
export { GdsnService, getGdsnService, type GdsnLookupResult } from './gdsn-service';

