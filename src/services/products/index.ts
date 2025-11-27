/**
 * Products service exports
 */

export { ProductService, getProductService } from './product-service';
export { ProductMatcherService, getProductMatcherService } from './product-matcher-service';

// GS1 Foundation (Phase 1)
export {
  ProductEnrichmentService,
  getProductEnrichmentService,
  type EnrichmentResult,
} from './product-enrichment-service';