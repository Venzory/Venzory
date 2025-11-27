-- GS1 Foundation Migration (Phase 1)
-- Adds GS1 manufacturer-level product data models
-- Safe migration: all new columns are nullable, no destructive changes

-- ============================================
-- NEW ENUMS
-- ============================================

-- PackagingLevel enum
CREATE TYPE "PackagingLevel" AS ENUM ('EACH', 'INNER_PACK', 'CASE', 'PALLET');

-- MediaType enum
CREATE TYPE "MediaType" AS ENUM ('PRODUCT_IMAGE', 'MARKETING_IMAGE', 'PLANOGRAM', 'VIDEO', 'THREE_D_MODEL');

-- DocumentType enum
CREATE TYPE "DocumentType" AS ENUM ('IFU', 'SDS', 'CE_DECLARATION', 'FDA_510K', 'TECHNICAL_FILE', 'LABEL_ARTWORK', 'CLINICAL_DATA', 'RISK_ANALYSIS', 'OTHER');

-- RegulatoryAuthority enum
CREATE TYPE "RegulatoryAuthority" AS ENUM ('EU_MDR', 'EU_IVDR', 'FDA', 'TGA', 'HEALTH_CANADA', 'PMDA', 'NMPA', 'OTHER');

-- ComplianceStatus enum
CREATE TYPE "ComplianceStatus" AS ENUM ('UNKNOWN', 'PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXEMPT', 'EXPIRED');

-- MatchMethod enum
CREATE TYPE "MatchMethod" AS ENUM ('MANUAL', 'EXACT_GTIN', 'FUZZY_NAME', 'BARCODE_SCAN', 'SUPPLIER_MAPPED');

-- SubscriptionStatus enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- ============================================
-- PRODUCT TABLE ENHANCEMENTS
-- ============================================

-- Add new GS1 fields to Product table
ALTER TABLE "Product" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "manufacturerGln" TEXT;
ALTER TABLE "Product" ADD COLUMN "manufacturerName" TEXT;
ALTER TABLE "Product" ADD COLUMN "tradeItemClassification" TEXT;
ALTER TABLE "Product" ADD COLUMN "targetMarket" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "isRegulatedDevice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "deviceRiskClass" TEXT;
ALTER TABLE "Product" ADD COLUMN "udiDi" TEXT;
ALTER TABLE "Product" ADD COLUMN "gudidDatabaseId" TEXT;
ALTER TABLE "Product" ADD COLUMN "eudamedId" TEXT;
ALTER TABLE "Product" ADD COLUMN "gmdnCode" TEXT;
ALTER TABLE "Product" ADD COLUMN "netContentValue" DECIMAL(12, 4);
ALTER TABLE "Product" ADD COLUMN "netContentUom" TEXT;
ALTER TABLE "Product" ADD COLUMN "grossWeight" DECIMAL(12, 4);
ALTER TABLE "Product" ADD COLUMN "grossWeightUom" TEXT;
ALTER TABLE "Product" ADD COLUMN "gs1SyncedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add new indexes to Product table
CREATE INDEX "Product_manufacturerGln_idx" ON "Product"("manufacturerGln");
CREATE INDEX "Product_gs1VerificationStatus_idx" ON "Product"("gs1VerificationStatus");
CREATE INDEX "Product_udiDi_idx" ON "Product"("udiDi");

-- ============================================
-- SUPPLIER ITEM TABLE ENHANCEMENTS
-- ============================================

-- Add new matching fields to SupplierItem table
ALTER TABLE "SupplierItem" ADD COLUMN "supplierName" TEXT;
ALTER TABLE "SupplierItem" ADD COLUMN "supplierDescription" TEXT;
ALTER TABLE "SupplierItem" ADD COLUMN "stockLevel" INTEGER;
ALTER TABLE "SupplierItem" ADD COLUMN "leadTimeDays" INTEGER;
ALTER TABLE "SupplierItem" ADD COLUMN "matchMethod" "MatchMethod" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "SupplierItem" ADD COLUMN "matchConfidence" DECIMAL(5, 4);
ALTER TABLE "SupplierItem" ADD COLUMN "matchedAt" TIMESTAMP(3);
ALTER TABLE "SupplierItem" ADD COLUMN "matchedBy" TEXT;

-- Add new indexes to SupplierItem table
CREATE INDEX "SupplierItem_supplierSku_idx" ON "SupplierItem"("supplierSku");
CREATE INDEX "SupplierItem_matchMethod_idx" ON "SupplierItem"("matchMethod");

-- ============================================
-- NEW TABLES
-- ============================================

-- ProductPackaging table
CREATE TABLE "ProductPackaging" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "level" "PackagingLevel" NOT NULL,
    "gtin" TEXT,
    "parentId" TEXT,
    "childCount" INTEGER,
    "height" DECIMAL(10, 3),
    "width" DECIMAL(10, 3),
    "depth" DECIMAL(10, 3),
    "dimensionUom" TEXT DEFAULT 'cm',
    "grossWeight" DECIMAL(10, 3),
    "weightUom" TEXT DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPackaging_pkey" PRIMARY KEY ("id")
);

-- ProductMedia table
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "angle" TEXT,
    "gs1DigitalLink" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- ProductDocument table
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "version" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- ProductRegulatory table
CREATE TABLE "ProductRegulatory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "authority" "RegulatoryAuthority" NOT NULL,
    "region" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "certificateNumber" TEXT,
    "registrationId" TEXT,
    "udiDi" TEXT,
    "udiPi" TEXT,
    "issuingAgency" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "notifiedBodyId" TEXT,
    "notifiedBodyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRegulatory_pkey" PRIMARY KEY ("id")
);

-- ProductLogistics table
CREATE TABLE "ProductLogistics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storageTemp" TEXT,
    "storageHumidity" TEXT,
    "isHazardous" BOOLEAN NOT NULL DEFAULT false,
    "hazardClass" TEXT,
    "shelfLifeDays" INTEGER,
    "useByDateFormat" TEXT,
    "countryOfOrigin" TEXT,
    "hsCode" TEXT,
    "customsDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLogistics_pkey" PRIMARY KEY ("id")
);

-- ProductQualityScore table
CREATE TABLE "ProductQualityScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "basicDataScore" INTEGER NOT NULL DEFAULT 0,
    "gs1DataScore" INTEGER NOT NULL DEFAULT 0,
    "mediaScore" INTEGER NOT NULL DEFAULT 0,
    "documentScore" INTEGER NOT NULL DEFAULT 0,
    "regulatoryScore" INTEGER NOT NULL DEFAULT 0,
    "packagingScore" INTEGER NOT NULL DEFAULT 0,
    "missingFields" TEXT[] DEFAULT '{}',
    "warnings" TEXT[] DEFAULT '{}',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductQualityScore_pkey" PRIMARY KEY ("id")
);

-- GdsnSubscription table
CREATE TABLE "GdsnSubscription" (
    "id" TEXT NOT NULL,
    "dataPoolId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "targetGln" TEXT NOT NULL,
    "sourceGln" TEXT,
    "gpcCategory" TEXT,
    "targetMarket" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "lastCinReceived" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GdsnSubscription_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- INDEXES
-- ============================================

-- ProductPackaging indexes
CREATE INDEX "ProductPackaging_productId_idx" ON "ProductPackaging"("productId");
CREATE INDEX "ProductPackaging_gtin_idx" ON "ProductPackaging"("gtin");
CREATE INDEX "ProductPackaging_level_idx" ON "ProductPackaging"("level");

-- ProductMedia indexes
CREATE INDEX "ProductMedia_productId_idx" ON "ProductMedia"("productId");
CREATE INDEX "ProductMedia_type_idx" ON "ProductMedia"("type");
CREATE INDEX "ProductMedia_isPrimary_idx" ON "ProductMedia"("isPrimary");

-- ProductDocument indexes
CREATE INDEX "ProductDocument_productId_idx" ON "ProductDocument"("productId");
CREATE INDEX "ProductDocument_type_idx" ON "ProductDocument"("type");
CREATE INDEX "ProductDocument_language_idx" ON "ProductDocument"("language");

-- ProductRegulatory indexes
CREATE INDEX "ProductRegulatory_productId_idx" ON "ProductRegulatory"("productId");
CREATE INDEX "ProductRegulatory_authority_idx" ON "ProductRegulatory"("authority");
CREATE INDEX "ProductRegulatory_udiDi_idx" ON "ProductRegulatory"("udiDi");
CREATE INDEX "ProductRegulatory_status_idx" ON "ProductRegulatory"("status");

-- ProductQualityScore indexes
CREATE INDEX "ProductQualityScore_overallScore_idx" ON "ProductQualityScore"("overallScore");

-- GdsnSubscription indexes
CREATE UNIQUE INDEX "GdsnSubscription_subscriptionId_key" ON "GdsnSubscription"("subscriptionId");
CREATE INDEX "GdsnSubscription_targetGln_idx" ON "GdsnSubscription"("targetGln");
CREATE INDEX "GdsnSubscription_status_idx" ON "GdsnSubscription"("status");
CREATE INDEX "GdsnSubscription_dataPoolId_idx" ON "GdsnSubscription"("dataPoolId");

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

-- ProductLogistics unique constraint on productId (one-to-one)
CREATE UNIQUE INDEX "ProductLogistics_productId_key" ON "ProductLogistics"("productId");

-- ProductQualityScore unique constraint on productId (one-to-one)
CREATE UNIQUE INDEX "ProductQualityScore_productId_key" ON "ProductQualityScore"("productId");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- ProductPackaging foreign keys
ALTER TABLE "ProductPackaging" ADD CONSTRAINT "ProductPackaging_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPackaging" ADD CONSTRAINT "ProductPackaging_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductPackaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProductMedia foreign key
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductDocument foreign key
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductRegulatory foreign key
ALTER TABLE "ProductRegulatory" ADD CONSTRAINT "ProductRegulatory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductLogistics foreign key
ALTER TABLE "ProductLogistics" ADD CONSTRAINT "ProductLogistics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductQualityScore foreign key
ALTER TABLE "ProductQualityScore" ADD CONSTRAINT "ProductQualityScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

