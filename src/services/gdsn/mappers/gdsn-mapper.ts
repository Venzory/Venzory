/**
 * GDSN Mapper (GS1 Foundation - Phase 6)
 * 
 * Provides mapping functions to convert provider-specific raw responses
 * into our unified GDSN domain types.
 * 
 * Data Flow:
 *   Provider API Response (XML/JSON)
 *     ↓ parseGdsnXmlResponse / parseGdsnJsonResponse
 *   ProviderRawResponse (provider-specific types)
 *     ↓ mapToGdsnProductData
 *   GdsnProductData (domain types)
 *     ↓ ProductEnrichmentService
 *   Prisma Models (database)
 */

import type {
  GdsnProductData,
  GdsnPackagingData,
  GdsnMediaData,
  GdsnDocumentData,
  GdsnRegulatoryData,
  GdsnLogisticsData,
  GdsnCinMessage,
} from '../gdsn-client';
import type {
  ProviderRawResponse,
  ProviderTradeItem,
  ProviderReferencedFile,
  ProviderPackaging,
  ProviderLanguageString,
  ProviderCinMessage,
} from '../types';
import { GdsnValidationError } from '../gdsn-client';

// ============================================================================
// XML Parsing
// ============================================================================

/**
 * Parse a GS1 XML 3.1 response into a ProviderRawResponse
 * 
 * @param xml - The raw XML string from the provider
 * @param providerId - The provider identifier
 * @returns Parsed provider response
 * @throws GdsnValidationError if XML is invalid
 * 
 * @example
 * ```typescript
 * const xml = await fetch('/api/gdsn/product/01234567890123').then(r => r.text());
 * const raw = parseGdsnXmlResponse(xml, '1worldsync');
 * const product = mapToGdsnProductData(raw);
 * ```
 */
export function parseGdsnXmlResponse(xml: string, providerId: string): ProviderRawResponse {
  try {
    // Use DOMParser for XML parsing (works in Node.js with jsdom or browser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new GdsnValidationError(
        `XML parsing failed: ${parseError.textContent}`,
        providerId,
        { xml: xml.substring(0, 500) }
      );
    }
    
    // Extract trade item from XML
    const tradeItem = extractTradeItemFromXml(doc);
    
    return {
      providerId,
      format: 'xml',
      receivedAt: new Date(),
      tradeItem,
      rawPayload: xml,
    };
  } catch (error) {
    if (error instanceof GdsnValidationError) {
      throw error;
    }
    throw new GdsnValidationError(
      `Failed to parse XML response: ${error instanceof Error ? error.message : String(error)}`,
      providerId,
      { xml: xml.substring(0, 500) }
    );
  }
}

/**
 * Extract trade item data from parsed XML document
 */
function extractTradeItemFromXml(doc: Document): ProviderTradeItem {
  // Helper to get text content from element
  const getText = (parent: Element | Document, selector: string): string | undefined => {
    const el = parent.querySelector(selector);
    return el?.textContent?.trim() || undefined;
  };
  
  // Helper to get all matching elements
  const getAll = (parent: Element | Document, selector: string): Element[] => {
    return Array.from(parent.querySelectorAll(selector));
  };
  
  // Helper to parse measurement
  const parseMeasurement = (el: Element | null) => {
    if (!el) return undefined;
    const value = parseFloat(el.textContent || '0');
    const unit = el.getAttribute('measurementUnitCode') || el.getAttribute('unitCode') || '';
    return { value, measurementUnitCode: unit };
  };
  
  // Find trade item element (handle different XML schemas)
  const tradeItemEl = doc.querySelector('tradeItem, TradeItem, catalogueItem');
  
  if (!tradeItemEl) {
    throw new GdsnValidationError('No trade item found in XML', undefined, {});
  }
  
  // Extract GTIN
  const gtin = getText(tradeItemEl, 'gtin, GTIN') || '';
  if (!gtin) {
    throw new GdsnValidationError('GTIN not found in trade item', undefined, {});
  }
  
  // Extract trade item description
  const descriptions = getAll(tradeItemEl, 'tradeItemDescription');
  const shortDescriptions = getAll(tradeItemEl, 'descriptionShort, shortDescription');
  
  // Extract target markets
  const targetMarkets = getAll(tradeItemEl, 'targetMarket, targetMarketCountryCode')
    .map(el => ({ targetMarketCountryCode: el.textContent?.trim() || '' }))
    .filter(tm => tm.targetMarketCountryCode);
  
  // Extract measurements
  const measurementsEl = tradeItemEl.querySelector('tradeItemMeasurements');
  
  // Extract healthcare info
  const healthcareEl = tradeItemEl.querySelector('healthcareItemInformation, medicalDeviceInformation');
  
  // Extract packaging
  const packagingEls = getAll(tradeItemEl, 'packagingInformation, packaging');
  
  // Extract referenced files
  const fileEls = getAll(tradeItemEl, 'referencedFileInformation, referencedFile, externalFileLink');
  
  // Extract handling info
  const handlingEl = tradeItemEl.querySelector('tradeItemHandlingInformation, handlingInformation');
  
  // Build the trade item
  const tradeItem: ProviderTradeItem = {
    gtin,
    informationProviderOfTradeItem: {
      gln: getText(tradeItemEl, 'informationProviderGLN, informationProviderOfTradeItem > gln'),
      partyName: getText(tradeItemEl, 'informationProviderName, manufacturerName'),
    },
    tradeItemDescriptionInformation: {
      tradeItemDescription: descriptions.map(el => ({
        languageCode: el.getAttribute('languageCode') || 'en',
        value: el.textContent?.trim() || '',
      })),
      descriptionShort: shortDescriptions.map(el => ({
        languageCode: el.getAttribute('languageCode') || 'en',
        value: el.textContent?.trim() || '',
      })),
      brandName: getText(tradeItemEl, 'brandName'),
      netContent: parseMeasurement(tradeItemEl.querySelector('netContent')),
    },
    gdsnTradeItemClassification: {
      gpcCategoryCode: getText(tradeItemEl, 'gpcCategoryCode'),
      gpcCategoryName: getText(tradeItemEl, 'gpcCategoryName'),
    },
    targetMarket: targetMarkets,
    tradeItemMeasurements: measurementsEl ? {
      grossWeight: parseMeasurement(measurementsEl.querySelector('grossWeight')),
      netWeight: parseMeasurement(measurementsEl.querySelector('netWeight')),
      height: parseMeasurement(measurementsEl.querySelector('height')),
      width: parseMeasurement(measurementsEl.querySelector('width')),
      depth: parseMeasurement(measurementsEl.querySelector('depth')),
    } : undefined,
    healthcareItemInformation: healthcareEl ? {
      isTradeItemAMedicalDevice: getText(healthcareEl, 'isTradeItemAMedicalDevice') === 'true',
      medicalDeviceClass: getText(healthcareEl, 'medicalDeviceClass, deviceRiskClass'),
      deviceIdentifier: getText(healthcareEl, 'deviceIdentifier, udiDeviceIdentifier'),
      gmdnCode: getText(healthcareEl, 'gmdnCode'),
      gmdnTermDescription: getText(healthcareEl, 'gmdnTermDescription'),
      notifiedBody: {
        notifiedBodyNumber: getText(healthcareEl, 'notifiedBodyNumber'),
        notifiedBodyName: getText(healthcareEl, 'notifiedBodyName'),
      },
      registrationInformation: {
        registrationNumber: getText(healthcareEl, 'registrationNumber'),
        certificateNumber: getText(healthcareEl, 'certificateNumber'),
        registrationStatus: getText(healthcareEl, 'registrationStatus, complianceStatus'),
        effectiveDate: getText(healthcareEl, 'effectiveDate, issuedDate'),
        expirationDate: getText(healthcareEl, 'expirationDate'),
      },
    } : undefined,
    packagingInformation: packagingEls.map(el => ({
      packagingLevel: getText(el, 'packagingLevel, packagingLevelCode'),
      packagedProductGtin: getText(el, 'packagedProductGtin, gtin'),
      totalQuantityOfNextLowerLevelTradeItem: parseInt(getText(el, 'totalQuantityOfNextLowerLevelTradeItem, quantity') || '0') || undefined,
      packagingDimensions: {
        height: parseMeasurement(el.querySelector('height')),
        width: parseMeasurement(el.querySelector('width')),
        depth: parseMeasurement(el.querySelector('depth')),
        grossWeight: parseMeasurement(el.querySelector('grossWeight')),
      },
    })),
    referencedFileInformation: fileEls.map(el => ({
      referencedFileTypeCode: getText(el, 'referencedFileTypeCode, fileTypeCode, typeCode'),
      uniformResourceIdentifier: getText(el, 'uniformResourceIdentifier, fileURL, url'),
      fileName: getText(el, 'fileName'),
      fileFormatName: getText(el, 'fileFormatName, mimeType'),
      fileSize: parseInt(getText(el, 'fileSize') || '0') || undefined,
      fileLanguageCode: getText(el, 'fileLanguageCode, languageCode'),
      fileEffectiveDate: getText(el, 'fileEffectiveDate, effectiveDate'),
      fileExpirationDate: getText(el, 'fileExpirationDate, expirationDate'),
      fileVersion: getText(el, 'fileVersion, version'),
      imagePixelHeight: parseInt(getText(el, 'imagePixelHeight, pixelHeight') || '0') || undefined,
      imagePixelWidth: parseInt(getText(el, 'imagePixelWidth, pixelWidth') || '0') || undefined,
      isPrimaryImage: getText(el, 'isPrimaryImage, isPrimary') === 'true',
      imageAngle: getText(el, 'imageAngle, angle'),
    })),
    tradeItemHandlingInformation: handlingEl ? {
      storageHandlingTemperatureInformation: {
        minimumTemperature: parseMeasurement(handlingEl.querySelector('minimumTemperature')),
        maximumTemperature: parseMeasurement(handlingEl.querySelector('maximumTemperature')),
      },
      minimumTradeItemLifespanFromTimeOfProduction: parseInt(getText(handlingEl, 'minimumTradeItemLifespanFromTimeOfProduction, shelfLifeDays') || '0') || undefined,
      dangerousGoodsInformation: {
        hazardClass: getText(handlingEl, 'hazardClass'),
      },
      countryOfOrigin: {
        countryCode: getText(handlingEl, 'countryOfOriginCode, countryOfOrigin') || '',
      },
      customsInformation: {
        hsCode: getText(handlingEl, 'hsCode, harmonizedSystemCode'),
      },
    } : undefined,
  };
  
  return tradeItem;
}

// ============================================================================
// JSON Parsing
// ============================================================================

/**
 * Parse a JSON response into a ProviderRawResponse
 * 
 * @param json - The raw JSON string or object from the provider
 * @param providerId - The provider identifier
 * @returns Parsed provider response
 * @throws GdsnValidationError if JSON is invalid
 * 
 * @example
 * ```typescript
 * const data = await fetch('/api/gdsn/product/01234567890123').then(r => r.json());
 * const raw = parseGdsnJsonResponse(data, 'syndigo');
 * const product = mapToGdsnProductData(raw);
 * ```
 */
export function parseGdsnJsonResponse(
  json: string | Record<string, unknown>,
  providerId: string
): ProviderRawResponse {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    // Extract trade item from JSON
    const tradeItem = extractTradeItemFromJson(data);
    
    return {
      providerId,
      format: 'json',
      receivedAt: new Date(),
      tradeItem,
      rawPayload: typeof json === 'string' ? json : JSON.stringify(json),
    };
  } catch (error) {
    if (error instanceof GdsnValidationError) {
      throw error;
    }
    throw new GdsnValidationError(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
      providerId,
      { json: typeof json === 'string' ? json.substring(0, 500) : 'object' }
    );
  }
}

/**
 * Extract trade item data from parsed JSON
 */
function extractTradeItemFromJson(data: Record<string, unknown>): ProviderTradeItem {
  // Handle different JSON structures from providers
  const item = (data.tradeItem || data.product || data.item || data) as Record<string, unknown>;
  
  const gtin = String(item.gtin || item.GTIN || '');
  if (!gtin) {
    throw new GdsnValidationError('GTIN not found in JSON response', undefined, {});
  }
  
  // Helper to safely get nested values
  const get = <T>(obj: unknown, path: string, defaultValue?: T): T | undefined => {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return defaultValue;
      current = (current as Record<string, unknown>)[part];
    }
    return (current as T) ?? defaultValue;
  };
  
  // Extract descriptions
  const descriptions = get<ProviderLanguageString[]>(item, 'descriptions') ||
    get<ProviderLanguageString[]>(item, 'tradeItemDescription') ||
    (item.description ? [{ languageCode: 'en', value: String(item.description) }] : []);
  
  // Extract target markets
  const markets = get<string[]>(item, 'targetMarkets') ||
    get<string[]>(item, 'targetMarket') ||
    [];
  
  // Extract packaging
  const packaging = get<unknown[]>(item, 'packaging') ||
    get<unknown[]>(item, 'packagingHierarchy') ||
    [];
  
  // Extract files/assets
  const files = get<unknown[]>(item, 'referencedFiles') ||
    get<unknown[]>(item, 'digitalAssets') ||
    get<unknown[]>(item, 'media') ||
    [];
  
  const tradeItem: ProviderTradeItem = {
    gtin,
    informationProviderOfTradeItem: {
      gln: get<string>(item, 'manufacturerGln') || get<string>(item, 'informationProviderGLN'),
      partyName: get<string>(item, 'manufacturerName') || get<string>(item, 'informationProviderName'),
    },
    tradeItemDescriptionInformation: {
      tradeItemDescription: Array.isArray(descriptions) ? descriptions : [],
      descriptionShort: get<ProviderLanguageString[]>(item, 'shortDescription') ||
        (item.shortDescription ? [{ languageCode: 'en', value: String(item.shortDescription) }] : []),
      brandName: get<string>(item, 'brandName') || get<string>(item, 'brand'),
      netContent: item.netContentValue ? {
        value: Number(item.netContentValue),
        measurementUnitCode: String(item.netContentUom || ''),
      } : undefined,
    },
    gdsnTradeItemClassification: {
      gpcCategoryCode: get<string>(item, 'gpcCategoryCode') || get<string>(item, 'classification'),
    },
    targetMarket: markets.map(code => ({ targetMarketCountryCode: String(code) })),
    tradeItemMeasurements: {
      grossWeight: item.grossWeight ? {
        value: Number(item.grossWeight),
        measurementUnitCode: String(item.grossWeightUom || 'kg'),
      } : undefined,
    },
    healthcareItemInformation: item.isRegulatedDevice !== undefined ? {
      isTradeItemAMedicalDevice: Boolean(item.isRegulatedDevice),
      medicalDeviceClass: get<string>(item, 'deviceRiskClass'),
      deviceIdentifier: get<string>(item, 'udiDi'),
      gmdnCode: get<string>(item, 'gmdnCode'),
      registrationInformation: {
        certificateNumber: get<string>(item, 'certificateNumber'),
        registrationStatus: get<string>(item, 'complianceStatus'),
      },
    } : undefined,
    packagingInformation: packaging.map(pkg => {
      const p = pkg as Record<string, unknown>;
      return {
        packagingLevel: get<string>(p, 'level'),
        packagedProductGtin: get<string>(p, 'gtin'),
        totalQuantityOfNextLowerLevelTradeItem: get<number>(p, 'childCount'),
        packagingDimensions: {
          height: p.height ? { value: Number(p.height), measurementUnitCode: String(p.dimensionUom || 'cm') } : undefined,
          width: p.width ? { value: Number(p.width), measurementUnitCode: String(p.dimensionUom || 'cm') } : undefined,
          depth: p.depth ? { value: Number(p.depth), measurementUnitCode: String(p.dimensionUom || 'cm') } : undefined,
          grossWeight: p.grossWeight ? { value: Number(p.grossWeight), measurementUnitCode: String(p.weightUom || 'kg') } : undefined,
        },
      };
    }),
    referencedFileInformation: files.map(file => {
      const f = file as Record<string, unknown>;
      return {
        referencedFileTypeCode: get<string>(f, 'type'),
        uniformResourceIdentifier: get<string>(f, 'url'),
        fileName: get<string>(f, 'filename'),
        fileFormatName: get<string>(f, 'mimeType'),
        fileLanguageCode: get<string>(f, 'language'),
        fileEffectiveDate: get<string>(f, 'effectiveDate'),
        fileExpirationDate: get<string>(f, 'expirationDate'),
        fileVersion: get<string>(f, 'version'),
        imagePixelHeight: get<number>(f, 'height'),
        imagePixelWidth: get<number>(f, 'width'),
        isPrimaryImage: get<boolean>(f, 'isPrimary'),
        imageAngle: get<string>(f, 'angle'),
      };
    }),
    tradeItemHandlingInformation: item.logisticsInfo || item.storageTemp ? {
      storageHandlingTemperatureInformation: {
        // Parse temperature string like "15-25°C"
      },
      minimumTradeItemLifespanFromTimeOfProduction: get<number>(item, 'logisticsInfo.shelfLifeDays') || get<number>(item, 'shelfLifeDays'),
      dangerousGoodsInformation: {
        hazardClass: get<string>(item, 'logisticsInfo.hazardClass') || get<string>(item, 'hazardClass'),
      },
      countryOfOrigin: {
        countryCode: get<string>(item, 'logisticsInfo.countryOfOrigin') || get<string>(item, 'countryOfOrigin') || '',
      },
      customsInformation: {
        hsCode: get<string>(item, 'logisticsInfo.hsCode') || get<string>(item, 'hsCode'),
      },
    } : undefined,
  };
  
  return tradeItem;
}

// ============================================================================
// Domain Mapping
// ============================================================================

/**
 * Map a ProviderRawResponse to our GdsnProductData domain type
 * 
 * @param raw - The parsed provider response
 * @returns Unified GDSN product data
 * 
 * @example
 * ```typescript
 * const raw = parseGdsnXmlResponse(xml, '1worldsync');
 * const product = mapToGdsnProductData(raw);
 * 
 * // product is now ready for ProductEnrichmentService
 * await enrichmentService.enrichFromGdsnData(productId, product);
 * ```
 */
export function mapToGdsnProductData(raw: ProviderRawResponse): GdsnProductData {
  const item = raw.tradeItem;
  
  // Get primary description (prefer English)
  const descriptions = item.tradeItemDescriptionInformation?.tradeItemDescription || [];
  const primaryDescription = findByLanguage(descriptions, 'en') || descriptions[0]?.value || '';
  
  const shortDescriptions = item.tradeItemDescriptionInformation?.descriptionShort || [];
  const shortDescription = findByLanguage(shortDescriptions, 'en') || shortDescriptions[0]?.value || null;
  
  // Map packaging hierarchy
  const packagingHierarchy = mapPackaging(item.packagingInformation || []);
  
  // Map digital assets (images, videos)
  const { digitalAssets, referencedDocuments } = mapReferencedFiles(item.referencedFileInformation || []);
  
  // Map regulatory info
  const regulatoryInfo = mapRegulatoryInfo(item.healthcareItemInformation);
  
  // Map logistics info
  const logisticsInfo = mapLogisticsInfo(item.tradeItemHandlingInformation);
  
  return {
    gtin: item.gtin,
    tradeItemDescription: primaryDescription,
    brandName: item.tradeItemDescriptionInformation?.brandName || null,
    shortDescription,
    manufacturerGln: item.informationProviderOfTradeItem?.gln || null,
    manufacturerName: item.informationProviderOfTradeItem?.partyName || null,
    gpcCategoryCode: item.gdsnTradeItemClassification?.gpcCategoryCode || null,
    targetMarket: item.targetMarket?.map(tm => tm.targetMarketCountryCode) || [],
    netContentValue: item.tradeItemDescriptionInformation?.netContent?.value || null,
    netContentUom: item.tradeItemDescriptionInformation?.netContent?.measurementUnitCode || null,
    grossWeight: item.tradeItemMeasurements?.grossWeight?.value || null,
    grossWeightUom: item.tradeItemMeasurements?.grossWeight?.measurementUnitCode || null,
    isRegulatedDevice: item.healthcareItemInformation?.isTradeItemAMedicalDevice || false,
    deviceRiskClass: item.healthcareItemInformation?.medicalDeviceClass || null,
    udiDi: item.healthcareItemInformation?.deviceIdentifier || null,
    gmdnCode: item.healthcareItemInformation?.gmdnCode || null,
    packagingHierarchy,
    digitalAssets,
    referencedDocuments,
    regulatoryInfo,
    logisticsInfo,
    raw: {
      providerId: raw.providerId,
      format: raw.format,
      receivedAt: raw.receivedAt.toISOString(),
      httpStatus: raw.httpStatus,
    },
  };
}

/**
 * Map CIN message from provider format to domain format
 */
export function mapToCinMessage(raw: ProviderCinMessage, providerId: string): GdsnCinMessage {
  return {
    messageId: raw.catalogueItemNotificationIdentification || `${providerId}-${raw.gtin}-${Date.now()}`,
    gtin: raw.gtin,
    sourceGln: raw.informationProviderGLN || '',
    changeType: mapChangeType(raw.catalogueItemState),
    effectiveDate: raw.effectiveDateTime ? new Date(raw.effectiveDateTime) : new Date(),
    timestamp: raw.creationDateTime ? new Date(raw.creationDateTime) : new Date(),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find string by language code, with fallbacks
 */
function findByLanguage(strings: ProviderLanguageString[], preferredLang: string): string | null {
  // Try exact match
  const exact = strings.find(s => s.languageCode.toLowerCase() === preferredLang.toLowerCase());
  if (exact) return exact.value;
  
  // Try prefix match (e.g., 'en' matches 'en-US')
  const prefix = strings.find(s => s.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase()));
  if (prefix) return prefix.value;
  
  return null;
}

/**
 * Map packaging information to domain format
 */
function mapPackaging(packaging: ProviderPackaging[]): GdsnPackagingData[] {
  const levelMap: Record<string, GdsnPackagingData['level']> = {
    'BASE_UNIT_OR_EACH': 'EACH',
    'EACH': 'EACH',
    'EA': 'EACH',
    'PACK_OR_INNER_PACK': 'INNER_PACK',
    'INNER_PACK': 'INNER_PACK',
    'IP': 'INNER_PACK',
    'CASE': 'CASE',
    'CS': 'CASE',
    'PALLET': 'PALLET',
    'PL': 'PALLET',
  };
  
  return packaging.map(pkg => ({
    level: levelMap[pkg.packagingLevel?.toUpperCase() || ''] || 'EACH',
    gtin: pkg.packagedProductGtin || null,
    childCount: pkg.totalQuantityOfNextLowerLevelTradeItem || null,
    height: pkg.packagingDimensions?.height?.value || null,
    width: pkg.packagingDimensions?.width?.value || null,
    depth: pkg.packagingDimensions?.depth?.value || null,
    dimensionUom: pkg.packagingDimensions?.height?.measurementUnitCode || null,
    grossWeight: pkg.packagingDimensions?.grossWeight?.value || null,
    weightUom: pkg.packagingDimensions?.grossWeight?.measurementUnitCode || null,
  }));
}

/**
 * Map referenced files to digital assets and documents
 */
function mapReferencedFiles(files: ProviderReferencedFile[]): {
  digitalAssets: GdsnMediaData[];
  referencedDocuments: GdsnDocumentData[];
} {
  const mediaTypeMap: Record<string, GdsnMediaData['type']> = {
    'PRODUCT_IMAGE': 'PRODUCT_IMAGE',
    'MARKETING_IMAGE': 'MARKETING_IMAGE',
    'PLANOGRAM': 'PLANOGRAM',
    'VIDEO': 'VIDEO',
    'THREE_D_MODEL': 'THREE_D_MODEL',
    'A1': 'PRODUCT_IMAGE', // GS1 code for product image
    'A2': 'MARKETING_IMAGE',
    'A3': 'PLANOGRAM',
    'VID': 'VIDEO',
    '3D': 'THREE_D_MODEL',
  };
  
  const docTypeMap: Record<string, GdsnDocumentData['type']> = {
    'INSTRUCTIONS_FOR_USE': 'IFU',
    'IFU': 'IFU',
    'SAFETY_DATA_SHEET': 'SDS',
    'SDS': 'SDS',
    'MSDS': 'SDS',
    'CE_DECLARATION': 'CE_DECLARATION',
    'DECLARATION_OF_CONFORMITY': 'CE_DECLARATION',
    'FDA_510K': 'FDA_510K',
    '510K': 'FDA_510K',
    'TECHNICAL_FILE': 'TECHNICAL_FILE',
    'LABEL_ARTWORK': 'LABEL_ARTWORK',
    'CLINICAL_DATA': 'CLINICAL_DATA',
    'RISK_ANALYSIS': 'RISK_ANALYSIS',
    'OTHER': 'OTHER',
  };
  
  const digitalAssets: GdsnMediaData[] = [];
  const referencedDocuments: GdsnDocumentData[] = [];
  
  for (const file of files) {
    const typeCode = file.referencedFileTypeCode?.toUpperCase() || '';
    const url = file.uniformResourceIdentifier || '';
    
    if (!url) continue;
    
    // Check if it's a media type
    const mediaType = mediaTypeMap[typeCode];
    if (mediaType) {
      digitalAssets.push({
        type: mediaType,
        url,
        filename: file.fileName || null,
        mimeType: file.fileFormatName || null,
        width: file.imagePixelWidth || null,
        height: file.imagePixelHeight || null,
        isPrimary: file.isPrimaryImage || false,
        angle: file.imageAngle || null,
      });
      continue;
    }
    
    // Check if it's a document type
    const docType = docTypeMap[typeCode] || 'OTHER';
    referencedDocuments.push({
      type: docType,
      title: file.fileName || typeCode || 'Document',
      language: file.fileLanguageCode || 'en',
      url,
      filename: file.fileName || null,
      effectiveDate: file.fileEffectiveDate ? new Date(file.fileEffectiveDate) : null,
      expirationDate: file.fileExpirationDate ? new Date(file.fileExpirationDate) : null,
      version: file.fileVersion || null,
    });
  }
  
  return { digitalAssets, referencedDocuments };
}

/**
 * Map healthcare/regulatory info to domain format
 */
function mapRegulatoryInfo(
  healthcare: ProviderTradeItem['healthcareItemInformation']
): GdsnRegulatoryData | null {
  if (!healthcare) return null;
  
  const reg = healthcare.registrationInformation;
  
  // Determine authority from available data
  let authority: GdsnRegulatoryData['authority'] = 'OTHER';
  const agencyCode = healthcare.regulatoryAgency?.agencyCode?.toUpperCase() || '';
  
  if (agencyCode.includes('MDR') || healthcare.regulatoryAgency?.region === 'EU') {
    authority = 'EU_MDR';
  } else if (agencyCode.includes('IVDR')) {
    authority = 'EU_IVDR';
  } else if (agencyCode.includes('FDA')) {
    authority = 'FDA';
  } else if (agencyCode.includes('TGA')) {
    authority = 'TGA';
  }
  
  // Map status
  const statusMap: Record<string, GdsnRegulatoryData['status']> = {
    'COMPLIANT': 'COMPLIANT',
    'APPROVED': 'COMPLIANT',
    'ACTIVE': 'COMPLIANT',
    'NON_COMPLIANT': 'NON_COMPLIANT',
    'REJECTED': 'NON_COMPLIANT',
    'PENDING': 'PENDING',
    'IN_REVIEW': 'PENDING',
    'EXEMPT': 'EXEMPT',
    'EXPIRED': 'EXPIRED',
  };
  const status = statusMap[reg?.registrationStatus?.toUpperCase() || ''] || 'UNKNOWN';
  
  return {
    authority,
    region: healthcare.regulatoryAgency?.region || null,
    status,
    certificateNumber: reg?.certificateNumber || null,
    registrationId: reg?.registrationNumber || null,
    udiDi: healthcare.deviceIdentifier || null,
    udiPi: null, // Production identifier template not typically in GDSN
    issuingAgency: 'GS1',
    issuedDate: reg?.effectiveDate ? new Date(reg.effectiveDate) : null,
    expirationDate: reg?.expirationDate ? new Date(reg.expirationDate) : null,
    notifiedBodyId: healthcare.notifiedBody?.notifiedBodyNumber || null,
    notifiedBodyName: healthcare.notifiedBody?.notifiedBodyName || null,
  };
}

/**
 * Map handling info to logistics domain format
 */
function mapLogisticsInfo(
  handling: ProviderTradeItem['tradeItemHandlingInformation']
): GdsnLogisticsData | null {
  if (!handling) return null;
  
  // Format temperature range
  let storageTemp: string | null = null;
  const tempInfo = handling.storageHandlingTemperatureInformation;
  if (tempInfo?.minimumTemperature && tempInfo?.maximumTemperature) {
    const min = tempInfo.minimumTemperature.value;
    const max = tempInfo.maximumTemperature.value;
    const unit = tempInfo.minimumTemperature.measurementUnitCode || 'CEL';
    const unitSymbol = unit === 'CEL' || unit === 'C' ? '°C' : '°F';
    storageTemp = `${min}-${max}${unitSymbol}`;
  }
  
  // Format humidity range
  let storageHumidity: string | null = null;
  const humidityInfo = handling.storageHandlingHumidityInformation;
  if (humidityInfo?.maximumHumidity) {
    storageHumidity = `<${humidityInfo.maximumHumidity}%`;
  }
  
  return {
    storageTemp,
    storageHumidity,
    isHazardous: !!handling.dangerousGoodsInformation?.hazardClass,
    hazardClass: handling.dangerousGoodsInformation?.hazardClass || null,
    shelfLifeDays: handling.minimumTradeItemLifespanFromTimeOfProduction || null,
    countryOfOrigin: handling.countryOfOrigin?.countryCode || null,
    hsCode: handling.customsInformation?.hsCode || null,
  };
}

/**
 * Map CIN change type
 */
function mapChangeType(state?: string): GdsnCinMessage['changeType'] {
  switch (state?.toUpperCase()) {
    case 'ADD':
    case 'NEW':
      return 'ADD';
    case 'CHANGE':
    case 'MODIFY':
    case 'UPDATE':
    case 'CORRECT':
      return 'CHANGE';
    case 'DELETE':
    case 'DISCONTINUE':
    case 'WITHDRAW':
      return 'DELETE';
    default:
      return 'CHANGE';
  }
}

