/**
 * Provider-Specific Response Types (GS1 Foundation - Phase 6)
 * 
 * These types represent the raw data structures returned by GDSN data pool providers
 * before being mapped to our internal GdsnProductData domain types.
 * 
 * Each provider (1WorldSync, Syndigo, GS1 GO) returns data in slightly different formats.
 * The mapper layer converts these provider-specific responses to our unified domain model.
 */

// ============================================================================
// Raw Response Container
// ============================================================================

/**
 * Container for raw provider responses
 * Used to preserve the original data for debugging and audit purposes
 */
export interface ProviderRawResponse {
  /** Provider identifier */
  providerId: string;
  
  /** Response format */
  format: 'xml' | 'json';
  
  /** Timestamp when the response was received */
  receivedAt: Date;
  
  /** HTTP status code (if applicable) */
  httpStatus?: number;
  
  /** Response headers (for debugging) */
  headers?: Record<string, string>;
  
  /** The parsed trade item data */
  tradeItem: ProviderTradeItem;
  
  /** Original raw response (for audit/debugging) */
  rawPayload?: string;
}

// ============================================================================
// GS1 XML 3.1 Compatible Types
// ============================================================================

/**
 * Trade Item as returned by GDSN providers
 * Based on GS1 XML 3.1 tradeItem schema
 */
export interface ProviderTradeItem {
  /** GTIN of the trade item */
  gtin: string;
  
  /** Information provider GLN */
  informationProviderOfTradeItem?: ProviderParty;
  
  /** Trade item descriptions */
  tradeItemDescriptionInformation?: ProviderTradeItemDescription;
  
  /** GPC classification */
  gdsnTradeItemClassification?: ProviderClassification;
  
  /** Target markets */
  targetMarket?: ProviderTargetMarket[];
  
  /** Trade item measurements */
  tradeItemMeasurements?: ProviderMeasurements;
  
  /** Healthcare/medical device information */
  healthcareItemInformation?: ProviderHealthcareInfo;
  
  /** Packaging information */
  packagingInformation?: ProviderPackaging[];
  
  /** Referenced files (images, documents) */
  referencedFileInformation?: ProviderReferencedFile[];
  
  /** Regulatory information */
  regulatoryInformation?: ProviderRegulatoryInfo;
  
  /** Trade item handling information */
  tradeItemHandlingInformation?: ProviderHandlingInfo;
  
  /** Additional trade item identification */
  additionalTradeItemIdentification?: ProviderAdditionalId[];
  
  /** Extension data (provider-specific) */
  extensions?: Record<string, unknown>;
}

/**
 * Party information (manufacturer, information provider, etc.)
 */
export interface ProviderParty {
  /** GLN (Global Location Number) */
  gln?: string;
  
  /** Party name */
  partyName?: string;
  
  /** Party role code */
  partyRoleCode?: string;
  
  /** Contact information */
  partyContactInformation?: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

/**
 * Trade item description information
 */
export interface ProviderTradeItemDescription {
  /** Full trade item description */
  tradeItemDescription?: ProviderLanguageString[];
  
  /** Short description */
  descriptionShort?: ProviderLanguageString[];
  
  /** Brand name */
  brandName?: string;
  
  /** Sub-brand name */
  subBrand?: string;
  
  /** Functional name */
  functionalName?: ProviderLanguageString[];
  
  /** Product variant */
  variant?: string;
  
  /** Net content */
  netContent?: ProviderMeasurement;
  
  /** Additional product descriptions */
  additionalTradeItemDescription?: ProviderLanguageString[];
}

/**
 * Language-specific string value
 */
export interface ProviderLanguageString {
  /** ISO 639-1 language code */
  languageCode: string;
  
  /** The string value */
  value: string;
}

/**
 * GPC Classification
 */
export interface ProviderClassification {
  /** GPC category code */
  gpcCategoryCode?: string;
  
  /** GPC category name */
  gpcCategoryName?: string;
  
  /** Additional classification codes */
  additionalClassification?: {
    code: string;
    codeListAgency?: string;
    codeDescription?: string;
  }[];
}

/**
 * Target market information
 */
export interface ProviderTargetMarket {
  /** ISO 3166-1 alpha-2 country code */
  targetMarketCountryCode: string;
}

/**
 * Measurement value with unit
 */
export interface ProviderMeasurement {
  /** Numeric value */
  value: number;
  
  /** Unit of measure code */
  measurementUnitCode: string;
}

/**
 * Trade item measurements (dimensions, weights)
 */
export interface ProviderMeasurements {
  /** Gross weight */
  grossWeight?: ProviderMeasurement;
  
  /** Net weight */
  netWeight?: ProviderMeasurement;
  
  /** Height */
  height?: ProviderMeasurement;
  
  /** Width */
  width?: ProviderMeasurement;
  
  /** Depth */
  depth?: ProviderMeasurement;
  
  /** Net content */
  netContent?: ProviderMeasurement;
  
  /** Drained weight */
  drainedWeight?: ProviderMeasurement;
}

/**
 * Healthcare/medical device specific information
 */
export interface ProviderHealthcareInfo {
  /** Is this a regulated medical device */
  isTradeItemAMedicalDevice?: boolean;
  
  /** Device risk class (I, IIa, IIb, III for EU MDR) */
  medicalDeviceClass?: string;
  
  /** UDI Device Identifier */
  deviceIdentifier?: string;
  
  /** GMDN code */
  gmdnCode?: string;
  
  /** GMDN term description */
  gmdnTermDescription?: string;
  
  /** Notified body information */
  notifiedBody?: {
    notifiedBodyNumber?: string;
    notifiedBodyName?: string;
  };
  
  /** Regulatory agency information */
  regulatoryAgency?: {
    agencyCode?: string;
    agencyName?: string;
    region?: string;
  };
  
  /** Registration/certificate numbers */
  registrationInformation?: {
    registrationNumber?: string;
    certificateNumber?: string;
    registrationStatus?: string;
    effectiveDate?: string;
    expirationDate?: string;
  };
}

/**
 * Packaging information
 */
export interface ProviderPackaging {
  /** Packaging level code */
  packagingLevel?: string;
  
  /** GTIN at this packaging level */
  packagedProductGtin?: string;
  
  /** Quantity of child items */
  totalQuantityOfNextLowerLevelTradeItem?: number;
  
  /** Packaging dimensions */
  packagingDimensions?: ProviderMeasurements;
  
  /** Packaging type code */
  packagingTypeCode?: string;
  
  /** Packaging material */
  packagingMaterial?: {
    materialCode?: string;
    materialWeight?: ProviderMeasurement;
  }[];
}

/**
 * Referenced file (image, document, video, etc.)
 */
export interface ProviderReferencedFile {
  /** Type of file */
  referencedFileTypeCode?: string;
  
  /** URL to the file */
  uniformResourceIdentifier?: string;
  
  /** File name */
  fileName?: string;
  
  /** MIME type */
  fileFormatName?: string;
  
  /** File size in bytes */
  fileSize?: number;
  
  /** Language code (for documents) */
  fileLanguageCode?: string;
  
  /** Effective date */
  fileEffectiveDate?: string;
  
  /** Expiration date */
  fileExpirationDate?: string;
  
  /** Version */
  fileVersion?: string;
  
  /** Image specific */
  imagePixelHeight?: number;
  imagePixelWidth?: number;
  isPrimaryImage?: boolean;
  imageAngle?: string;
}

/**
 * Regulatory information
 */
export interface ProviderRegulatoryInfo {
  /** Regulatory agency code */
  regulatoryAgencyCode?: string;
  
  /** Compliance status */
  complianceStatus?: string;
  
  /** Certificate/registration numbers */
  regulatoryIdentification?: {
    type: string;
    value: string;
    issuingAgency?: string;
    effectiveDate?: string;
    expirationDate?: string;
  }[];
  
  /** UDI information */
  udiInformation?: {
    udiDeviceIdentifier?: string;
    udiProductionIdentifier?: string;
    issuingAgency?: string;
  };
  
  /** Warnings and precautions */
  warningsAndPrecautions?: ProviderLanguageString[];
}

/**
 * Trade item handling information
 */
export interface ProviderHandlingInfo {
  /** Storage and handling instructions */
  storageHandlingTemperatureInformation?: {
    minimumTemperature?: ProviderMeasurement;
    maximumTemperature?: ProviderMeasurement;
    temperatureQualifierCode?: string;
  };
  
  /** Humidity requirements */
  storageHandlingHumidityInformation?: {
    minimumHumidity?: number;
    maximumHumidity?: number;
  };
  
  /** Shelf life */
  minimumTradeItemLifespanFromTimeOfProduction?: number;
  
  /** Hazardous information */
  dangerousGoodsInformation?: {
    unNumber?: string;
    hazardClass?: string;
    packingGroup?: string;
  };
  
  /** Country of origin */
  countryOfOrigin?: {
    countryCode: string;
  };
  
  /** Customs information */
  customsInformation?: {
    hsCode?: string;
    customsDescription?: string;
  };
}

/**
 * Additional trade item identification
 */
export interface ProviderAdditionalId {
  /** Type of identifier */
  additionalTradeItemIdentificationTypeCode: string;
  
  /** The identifier value */
  additionalTradeItemIdentificationValue: string;
}

// ============================================================================
// CIN (Change In Notification) Types
// ============================================================================

/**
 * Raw CIN message from provider
 */
export interface ProviderCinMessage {
  /** Message ID */
  catalogueItemNotificationIdentification?: string;
  
  /** GTIN of affected product */
  gtin: string;
  
  /** Source data pool */
  sourceDataPool?: string;
  
  /** Information provider GLN */
  informationProviderGLN?: string;
  
  /** Type of change */
  catalogueItemState?: 'ADD' | 'CHANGE' | 'DELETE' | 'CORRECT';
  
  /** Effective date of change */
  effectiveDateTime?: string;
  
  /** Message timestamp */
  creationDateTime?: string;
  
  /** Target market */
  targetMarketCountryCode?: string;
}

// ============================================================================
// Provider-Specific Extensions
// ============================================================================

/**
 * 1WorldSync specific extensions
 */
export interface OneWorldSyncExtensions {
  /** 1WorldSync item ID */
  itemId?: string;
  
  /** Publication status */
  publicationStatus?: string;
  
  /** Workflow state */
  workflowState?: string;
  
  /** Quality score */
  dataQualityScore?: number;
}

/**
 * Syndigo specific extensions
 */
export interface SyndigoExtensions {
  /** Syndigo product ID */
  productId?: string;
  
  /** Enhanced content */
  enhancedContent?: {
    marketingCopy?: string;
    features?: string[];
    bullets?: string[];
  };
}

/**
 * GS1 GO specific extensions
 */
export interface Gs1GoExtensions {
  /** GS1 GO record ID */
  recordId?: string;
  
  /** Verification status */
  verificationStatus?: 'verified' | 'unverified' | 'pending';
  
  /** Data source */
  dataSource?: string;
}

