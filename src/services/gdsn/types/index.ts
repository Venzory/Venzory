/**
 * GDSN Types Module
 * 
 * Re-exports all GDSN-related types for convenient importing.
 */

export type {
  // Raw response types
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
  
  // Provider-specific extensions
  OneWorldSyncExtensions,
  SyndigoExtensions,
  Gs1GoExtensions,
} from './provider-response';

