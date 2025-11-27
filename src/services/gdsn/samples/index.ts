/**
 * GDSN Sample Data Module
 * 
 * Provides access to sample XML and JSON data for testing GDSN parsing
 * and mapping functionality.
 * 
 * @example
 * ```typescript
 * import { SAMPLE_XML_MEDICAL_DEVICE, SAMPLE_JSON_MEDICAL_DEVICE } from './samples';
 * import { parseGdsnXmlResponse, parseGdsnJsonResponse, mapToGdsnProductData } from './mappers';
 * 
 * // Parse XML sample
 * const rawXml = parseGdsnXmlResponse(SAMPLE_XML_MEDICAL_DEVICE, 'sample');
 * const productFromXml = mapToGdsnProductData(rawXml);
 * 
 * // Parse JSON sample
 * const rawJson = parseGdsnJsonResponse(SAMPLE_JSON_MEDICAL_DEVICE, 'sample');
 * const productFromJson = mapToGdsnProductData(rawJson);
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// Sample file paths (relative to this module)
const SAMPLES_DIR = __dirname;

/**
 * Load a sample file synchronously
 */
function loadSample(filename: string): string {
  try {
    return fs.readFileSync(path.join(SAMPLES_DIR, filename), 'utf-8');
  } catch {
    // Return embedded sample if file not found (for bundled environments)
    return '';
  }
}

/**
 * Sample GS1 XML 3.1 medical device (surgical gloves)
 * GTIN: 04006501003638
 */
export const SAMPLE_XML_MEDICAL_DEVICE = `<?xml version="1.0" encoding="UTF-8"?>
<tradeItemMessage xmlns="urn:gs1:gdsn:tradeitem:xsd:3">
  <tradeItem>
    <gtin>04006501003638</gtin>
    <informationProviderOfTradeItem>
      <gln>4006501000001</gln>
      <partyName>MedPro Medical Supplies GmbH</partyName>
    </informationProviderOfTradeItem>
    <tradeItemDescriptionInformation>
      <tradeItemDescription languageCode="en">Sterile Surgical Gloves (Size M)</tradeItemDescription>
      <descriptionShort languageCode="en">Latex-free sterile surgical gloves</descriptionShort>
      <brandName>MedPro</brandName>
      <netContent measurementUnitCode="PAIR">50</netContent>
    </tradeItemDescriptionInformation>
    <gdsnTradeItemClassification>
      <gpcCategoryCode>10000449</gpcCategoryCode>
    </gdsnTradeItemClassification>
    <targetMarket><targetMarketCountryCode>NL</targetMarketCountryCode></targetMarket>
    <targetMarket><targetMarketCountryCode>DE</targetMarketCountryCode></targetMarket>
    <tradeItemMeasurements>
      <grossWeight measurementUnitCode="KGM">0.5</grossWeight>
    </tradeItemMeasurements>
    <healthcareItemInformation>
      <isTradeItemAMedicalDevice>true</isTradeItemAMedicalDevice>
      <medicalDeviceClass>IIa</medicalDeviceClass>
      <deviceIdentifier>(01)04006501003638</deviceIdentifier>
      <gmdnCode>35370</gmdnCode>
      <notifiedBody>
        <notifiedBodyNumber>0297</notifiedBodyNumber>
        <notifiedBodyName>BSI Group</notifiedBodyName>
      </notifiedBody>
      <regulatoryAgency>
        <agencyCode>EU_MDR</agencyCode>
        <region>EU</region>
      </regulatoryAgency>
      <registrationInformation>
        <certificateNumber>CE-2023-12345</certificateNumber>
        <registrationStatus>COMPLIANT</registrationStatus>
        <effectiveDate>2023-06-01</effectiveDate>
        <expirationDate>2028-06-01</expirationDate>
      </registrationInformation>
    </healthcareItemInformation>
    <packagingInformation>
      <packagingLevel>EACH</packagingLevel>
      <packagedProductGtin>04006501003638</packagedProductGtin>
      <totalQuantityOfNextLowerLevelTradeItem>1</totalQuantityOfNextLowerLevelTradeItem>
      <packagingDimensions>
        <height measurementUnitCode="CMT">25</height>
        <width measurementUnitCode="CMT">12</width>
        <depth measurementUnitCode="CMT">3</depth>
        <grossWeight measurementUnitCode="KGM">0.01</grossWeight>
      </packagingDimensions>
    </packagingInformation>
    <packagingInformation>
      <packagingLevel>CASE</packagingLevel>
      <packagedProductGtin>14006501003635</packagedProductGtin>
      <totalQuantityOfNextLowerLevelTradeItem>50</totalQuantityOfNextLowerLevelTradeItem>
      <packagingDimensions>
        <height measurementUnitCode="CMT">30</height>
        <width measurementUnitCode="CMT">40</width>
        <depth measurementUnitCode="CMT">25</depth>
        <grossWeight measurementUnitCode="KGM">0.6</grossWeight>
      </packagingDimensions>
    </packagingInformation>
    <referencedFileInformation>
      <referencedFileTypeCode>PRODUCT_IMAGE</referencedFileTypeCode>
      <uniformResourceIdentifier>https://cdn.example.com/images/gloves-m-front.jpg</uniformResourceIdentifier>
      <fileName>gloves-m-front.jpg</fileName>
      <fileFormatName>image/jpeg</fileFormatName>
      <imagePixelWidth>1200</imagePixelWidth>
      <imagePixelHeight>1200</imagePixelHeight>
      <isPrimaryImage>true</isPrimaryImage>
      <imageAngle>front</imageAngle>
    </referencedFileInformation>
    <referencedFileInformation>
      <referencedFileTypeCode>IFU</referencedFileTypeCode>
      <uniformResourceIdentifier>https://docs.example.com/ifu/gloves-ifu-en.pdf</uniformResourceIdentifier>
      <fileName>gloves-ifu-en.pdf</fileName>
      <fileFormatName>application/pdf</fileFormatName>
      <fileLanguageCode>en</fileLanguageCode>
      <fileEffectiveDate>2023-01-01</fileEffectiveDate>
      <fileVersion>2.1</fileVersion>
    </referencedFileInformation>
    <referencedFileInformation>
      <referencedFileTypeCode>CE_DECLARATION</referencedFileTypeCode>
      <uniformResourceIdentifier>https://docs.example.com/ce/gloves-ce-declaration.pdf</uniformResourceIdentifier>
      <fileName>gloves-ce-declaration.pdf</fileName>
      <fileFormatName>application/pdf</fileFormatName>
      <fileLanguageCode>en</fileLanguageCode>
      <fileEffectiveDate>2023-06-01</fileEffectiveDate>
      <fileExpirationDate>2028-06-01</fileExpirationDate>
      <fileVersion>1.0</fileVersion>
    </referencedFileInformation>
    <tradeItemHandlingInformation>
      <storageHandlingTemperatureInformation>
        <minimumTemperature measurementUnitCode="CEL">15</minimumTemperature>
        <maximumTemperature measurementUnitCode="CEL">25</maximumTemperature>
      </storageHandlingTemperatureInformation>
      <storageHandlingHumidityInformation>
        <maximumHumidity>80</maximumHumidity>
      </storageHandlingHumidityInformation>
      <minimumTradeItemLifespanFromTimeOfProduction>1825</minimumTradeItemLifespanFromTimeOfProduction>
      <countryOfOrigin><countryCode>MY</countryCode></countryOfOrigin>
      <customsInformation><hsCode>4015.11.00</hsCode></customsInformation>
    </tradeItemHandlingInformation>
  </tradeItem>
</tradeItemMessage>`;

/**
 * Sample JSON medical device (syringes)
 * GTIN: 05901234567890
 */
export const SAMPLE_JSON_MEDICAL_DEVICE = {
  tradeItem: {
    gtin: '05901234567890',
    informationProviderGLN: '5901234000001',
    manufacturerName: 'MediSafe Medical Devices Sp. z o.o.',
    descriptions: [
      { languageCode: 'en', value: 'Disposable Syringes 5ml Luer Lock' },
      { languageCode: 'pl', value: 'Strzykawki jednorazowe 5ml Luer Lock' },
    ],
    shortDescription: [
      { languageCode: 'en', value: 'Sterile single-use syringes with Luer lock' },
    ],
    brandName: 'MediSafe',
    gpcCategoryCode: '10000449',
    targetMarkets: ['NL', 'DE', 'PL', 'BE'],
    netContentValue: 100,
    netContentUom: 'piece',
    grossWeight: 0.8,
    grossWeightUom: 'kg',
    isRegulatedDevice: true,
    deviceRiskClass: 'I',
    udiDi: '(01)05901234567890',
    gmdnCode: '47017',
    certificateNumber: 'CE-2024-SYR-001',
    registrationId: 'EUDAMED-2024-001234',
    complianceStatus: 'COMPLIANT',
    notifiedBodyId: '0123',
    notifiedBodyName: 'TÜV SÜD',
    packaging: [
      {
        level: 'EACH',
        gtin: '05901234567890',
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
        url: 'https://cdn.example.com/images/syringe-5ml-front.jpg',
        filename: 'syringe-5ml-front.jpg',
        mimeType: 'image/jpeg',
        width: 1000,
        height: 1000,
        isPrimary: true,
        angle: 'front',
      },
      {
        type: 'PRODUCT_IMAGE',
        url: 'https://cdn.example.com/images/syringe-5ml-detail.jpg',
        filename: 'syringe-5ml-detail.jpg',
        mimeType: 'image/jpeg',
        width: 1000,
        height: 1000,
        isPrimary: false,
        angle: 'detail',
      },
    ],
    referencedFiles: [
      {
        type: 'IFU',
        url: 'https://docs.example.com/ifu/syringe-ifu-en.pdf',
        filename: 'syringe-ifu-en.pdf',
        language: 'en',
        effectiveDate: '2024-01-15',
        version: '1.2',
      },
      {
        type: 'CE_DECLARATION',
        url: 'https://docs.example.com/ce/syringe-ce-declaration.pdf',
        filename: 'syringe-ce-declaration.pdf',
        language: 'en',
        effectiveDate: '2024-02-01',
        expirationDate: '2029-02-01',
        version: '1.0',
      },
      {
        type: 'SDS',
        url: 'https://docs.example.com/sds/syringe-sds-en.pdf',
        filename: 'syringe-sds-en.pdf',
        language: 'en',
        effectiveDate: '2024-01-01',
        version: '2.0',
      },
    ],
    logisticsInfo: {
      storageTemp: '5-30°C',
      storageHumidity: '<70%',
      isHazardous: false,
      shelfLifeDays: 1825,
      countryOfOrigin: 'PL',
      hsCode: '9018.31.10',
    },
  },
};

/**
 * Sample CIN (Change In Notification) messages
 */
export const SAMPLE_CIN_MESSAGES = [
  {
    catalogueItemNotificationIdentification: 'CIN-2024-1127-001',
    gtin: '04006501003638',
    informationProviderGLN: '4006501000001',
    catalogueItemState: 'CHANGE' as const,
    effectiveDateTime: '2024-11-27T00:00:00Z',
    creationDateTime: '2024-11-27T10:30:00Z',
    targetMarketCountryCode: 'NL',
  },
  {
    catalogueItemNotificationIdentification: 'CIN-2024-1127-002',
    gtin: '05901234567890',
    informationProviderGLN: '5901234000001',
    catalogueItemState: 'ADD' as const,
    effectiveDateTime: '2024-11-27T00:00:00Z',
    creationDateTime: '2024-11-27T10:35:00Z',
    targetMarketCountryCode: 'DE',
  },
  {
    catalogueItemNotificationIdentification: 'CIN-2024-1127-003',
    gtin: '08714632012345',
    informationProviderGLN: '8714632000001',
    catalogueItemState: 'DELETE' as const,
    effectiveDateTime: '2024-11-30T00:00:00Z',
    creationDateTime: '2024-11-27T10:40:00Z',
    targetMarketCountryCode: 'NL',
  },
];

/**
 * Load full XML sample from file
 * Use this when the embedded sample is not sufficient
 */
export function loadXmlSample(filename: string = 'sample-medical-device.xml'): string {
  return loadSample(filename) || SAMPLE_XML_MEDICAL_DEVICE;
}

/**
 * Load full JSON sample from file
 * Use this when the embedded sample is not sufficient
 */
export function loadJsonSample(filename: string = 'sample-medical-device.json'): Record<string, unknown> {
  const content = loadSample(filename);
  if (content) {
    try {
      return JSON.parse(content);
    } catch {
      return SAMPLE_JSON_MEDICAL_DEVICE;
    }
  }
  return SAMPLE_JSON_MEDICAL_DEVICE;
}

