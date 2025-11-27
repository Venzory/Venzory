/**
 * GDSN Providers Module
 * 
 * Contains implementations of the IGdsnClient interface for different
 * GDSN data pool providers.
 * 
 * Currently available:
 * - SampleGdsnProvider: Demonstration provider using static samples
 * 
 * Future providers (Phase 7+):
 * - OneWorldSyncProvider: 1WorldSync data pool integration
 * - SyndigoProvider: Syndigo data pool integration
 * - Gs1GoProvider: GS1 GO data pool integration
 */

export {
  SampleGdsnProvider,
  createSampleProvider,
  sampleProviderFactory,
  type SampleProviderFactory,
} from './sample-provider';

