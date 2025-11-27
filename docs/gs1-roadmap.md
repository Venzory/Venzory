# GS1-Driven Product Master System Roadmap

**Version:** 1.0  
**Created:** November 27, 2025  
**Status:** Active Development  

---

## 1. Context & Goal

### About Venzory

Venzory is a multi-tenant inventory management platform for medical practices. Practices order supplies from various suppliers, receive goods, manage stock levels, and track inventory across locations.

### The Problem

Medical device suppliers (Remka, Merkala, Daxtrio, Praxisdienst, etc.) sell products with incomplete, inconsistent, or varying product data. Different suppliers may describe the same product differently, use different SKUs, and lack standardized identifiers. This creates:

- Duplicate products in the system
- Inconsistent product information
- Missing regulatory data (UDI, CE marks)
- No authoritative source of truth

### The Solution: GS1 as Manufacturer-Level Source of Truth

**Manufacturers** (Johnson & Johnson, BD, 3M, Medtronic, etc.) publish authoritative product data into **GS1/GDSN** (Global Data Synchronization Network). This data is:

- Correct and complete
- Standardized globally
- Includes packaging hierarchy, images, documents, regulatory info
- The single source of truth

**Zenvory's approach:**

1. When a supplier is connected, import their catalog (SKU, price, stock)
2. Match each supplier item to a GTIN (barcode)
3. Query GS1/GDSN for the authoritative manufacturer data
4. Enrich the product master with all GS1 attributes
5. Store supplier-specific fields separately (price, stock, lead time)
6. Create a unified product master combining both layers

---

## 2. Core Concepts & Glossary

### Manufacturer vs Supplier

| Term | Definition |
|------|------------|
| **Manufacturer** | The company that produces the product (e.g., 3M, BD, Medtronic). They publish authoritative data to GS1. |
| **Supplier** | A distributor or reseller that sells the manufacturer's products (e.g., Remka, Praxisdienst). They provide pricing and stock data. |

### Key Identifiers

| Term | Definition |
|------|------------|
| **GTIN** | Global Trade Item Number. The barcode number (8, 12, 13, or 14 digits) that uniquely identifies a product. |
| **GLN** | Global Location Number. Identifies a legal entity, functional unit, or physical location. |
| **UDI** | Unique Device Identification. Required for medical devices; consists of UDI-DI (device identifier) and UDI-PI (production identifier). |
| **GPC** | Global Product Classification. Hierarchical categorization of products. |

### GS1 & GDSN

| Term | Definition |
|------|------------|
| **GS1** | The global standards organization that manages GTINs, GLNs, and data standards. |
| **GDSN** | Global Data Synchronization Network. The network through which manufacturers publish and subscribers receive product data. |
| **Data Pool** | A certified service (e.g., 1WorldSync, Syndigo, GS1 GO) that connects to GDSN and provides API access. |
| **CIN** | Catalogue Item Notification. A message sent when product data changes in GDSN. |

### Zenvory Concepts

| Term | Definition |
|------|------------|
| **Product** | The GS1 manufacturer-level product master in Zenvory. One record per unique GTIN. |
| **SupplierItem** | A supplier's offering of a Product, with their pricing, SKU, and stock. Multiple SupplierItems can link to one Product. |
| **Enrichment** | The process of fetching GS1 data and populating Product attributes. |
| **Product Master** | The unified view combining GS1 manufacturer data with supplier data. |
| **Match Confidence** | A score (0.0-1.0) indicating how certain we are that a supplier item maps to a Product. |

---

## 3. High-Level Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GS1 / GDSN                                      │
│   Manufacturers publish authoritative product data                          │
│   (3M, BD, Medtronic, J&J, etc.)                                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ GDSN Sync / CIN Notifications
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Pool Provider                                 │
│   (1WorldSync, Syndigo, GS1 GO)                                            │
│   - Receives manufacturer data                                              │
│   - Provides API access                                                     │
│   - Sends change notifications                                              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ REST API / Webhooks
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ZENVORY                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 1: Product (GS1 Master)                      │   │
│  │  - GTIN (unique identifier)                                          │   │
│  │  - Manufacturer data (name, brand, description)                      │   │
│  │  - Packaging hierarchy                                               │   │
│  │  - Media assets (images)                                             │   │
│  │  - Documents (IFU, SDS, CE)                                          │   │
│  │  - Regulatory (UDI, GMDN, compliance)                                │   │
│  │  - Logistics (storage, shelf life)                                   │   │
│  │  Source: GS1/GDSN (authoritative)                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│                                  │ Links via GTIN                            │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 2: SupplierItem                             │   │
│  │  - Supplier's SKU                                                    │   │
│  │  - Supplier's price, stock, lead time                               │   │
│  │  - Match method & confidence                                         │   │
│  │  Source: Supplier catalogs (secondary)                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 3: Practice Item                            │   │
│  │  - Practice-specific naming, SKU                                     │   │
│  │  - Inventory levels per location                                     │   │
│  │  - Reorder settings                                                  │   │
│  │  Source: Practice configuration                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **GS1 as Ground Truth**: Product attributes from GS1 (name, description, regulatory) are authoritative and override supplier-provided values.

2. **Supplier Data Enriches**: Suppliers provide commercial data (price, stock, availability) that supplements the GS1 master.

3. **Match & Link**: Supplier items are matched to Products via GTIN. Unmatched items are queued for review.

4. **Quality Scoring**: Each Product has a quality score indicating data completeness. Low scores trigger enrichment workflows.

5. **Versioning**: Product changes are tracked for audit and delta detection.

---

## 4. Data Model Overview

### Product (GS1 Manufacturer Master)

**What it represents:** The canonical product record, populated primarily from GS1/GDSN data. One record per unique product (identified by GTIN).

**Key fields:**
- Core identifiers: GTIN, manufacturer GLN, manufacturer name
- Descriptive: name, brand, description, short description
- Classification: trade item classification (GPC code), target markets
- Medical device: risk class, UDI-DI, GUDID ID, EUDAMED ID, GMDN code
- Physical: net content, gross weight with units
- GS1 status: verification status, last sync timestamp, raw GS1 JSON data
- Version tracking: version number for change detection

**Relations:** Has many ProductPackaging, ProductMedia, ProductDocument, ProductRegulatory. Has one ProductLogistics, ProductQualityScore. Referenced by many SupplierItem and Item records.

---

### ProductPackaging

**What it represents:** The packaging hierarchy for a product (each, inner pack, case, pallet). Each level may have its own GTIN.

**Key fields:**
- Packaging level (EACH, INNER_PACK, CASE, PALLET)
- GTIN at this level
- Parent/child relationships (hierarchy)
- Dimensions (height, width, depth) with unit
- Gross weight with unit
- Child count (how many items at this level)

**Relations:** Belongs to Product. Self-referencing hierarchy (parent/children).

---

### ProductMedia

**What it represents:** Images and visual assets associated with a product.

**Key fields:**
- Media type (product image, marketing image, planogram, video)
- URL and filename
- MIME type and file size
- Image dimensions
- Primary flag (is this the main image?)
- Angle/view (front, back, left, right)
- Storage provider and key (for downloaded assets)

**Relations:** Belongs to Product.

---

### ProductDocument

**What it represents:** Documents such as Instructions for Use (IFU), Safety Data Sheets (SDS), CE declarations, and technical files.

**Key fields:**
- Document type (IFU, SDS, CE_DECLARATION, FDA_510K, etc.)
- Title and language
- URL and filename
- MIME type and file size
- Effective and expiration dates
- Version number
- Storage provider and key

**Relations:** Belongs to Product.

---

### ProductRegulatory

**What it represents:** Regulatory compliance and certification information for medical devices.

**Key fields:**
- Regulatory authority (EU_MDR, FDA, TGA, etc.)
- Region
- Compliance status (compliant, pending, expired, etc.)
- Certificate/registration numbers
- UDI-DI and UDI-PI (production identifier template)
- Issuing agency (GS1, HIBCC, ICCBBA)
- Validity dates
- Notified body info (EU)

**Relations:** Belongs to Product.

---

### ProductLogistics

**What it represents:** Storage, handling, and customs information for a product.

**Key fields:**
- Storage conditions (temperature, humidity)
- Hazardous flag and class
- Shelf life in days
- Country of origin
- HS code (customs)
- Customs description

**Relations:** Belongs to Product (one-to-one).

---

### ProductQualityScore

**What it represents:** A calculated score indicating data completeness and quality.

**Key fields:**
- Overall score (0-100)
- Component scores: basic data, GS1 data, media, documents, regulatory, packaging
- List of missing fields
- List of warnings
- Calculation timestamp

**Relations:** Belongs to Product (one-to-one).

---

### SupplierItem (Enhanced)

**What it represents:** A supplier's offering of a product, linking a GlobalSupplier to a Product with commercial terms.

**Key fields (existing):**
- GlobalSupplier reference
- Product reference
- Supplier SKU, name, description
- Pricing (unit price, currency, min order quantity)
- Stock level and lead time
- Integration type and config
- Active flag

**Key fields (new for matching):**
- Match method (MANUAL, EXACT_GTIN, FUZZY_NAME, BARCODE_SCAN, SUPPLIER_MAPPED)
- Match confidence (0.0000-1.0000)
- Matched at timestamp
- Matched by (user or system)

**Relations:** Belongs to GlobalSupplier. Belongs to Product.

---

### GdsnSubscription

**What it represents:** A subscription to receive product data from GDSN for specific criteria.

**Key fields:**
- Data pool provider ID
- Subscription ID (from provider)
- Target GLN (our receiving GLN)
- Source GLN (publisher, optional)
- GPC category filter
- Target market filter
- Status (pending, active, suspended, cancelled)
- Activation and last notification timestamps

**Relations:** Standalone entity for GDSN integration management.

---

## 5. Phased Implementation Plan

### Phase 1 — GS1 Foundation (Data Model & Service Skeletons)

**Goal:** Establish the database schema and code structure for GS1 data without external integrations.

**Scope:**
- Prisma schema updates:
  - Enhance Product model with GS1 fields
  - Add ProductPackaging, ProductMedia, ProductDocument, ProductRegulatory, ProductLogistics, ProductQualityScore
  - Add GdsnSubscription
  - Extend SupplierItem with match fields
- Create migrations (safe, backwards-compatible)
- Repository classes for all new models
- Service skeletons with mock implementations
- No real GDSN provider integration

**Out of scope:**
- Real GDSN API calls
- Supplier import pipeline
- AI/fuzzy matching
- Media/document downloads

**Dependencies:** None (foundational phase)

**Deliverables:**
- Updated `prisma/schema.prisma`
- Migration file
- Repository classes in `src/repositories/`
- Service skeletons in `src/services/`
- `docs/gs1-foundation-implementation.md`

---

### Phase 2 — Basic GDSN Integration

**Goal:** Connect to a GDSN data pool provider and enable manual GS1 lookups.

**Scope:**
- Select and configure GDSN data pool provider (1WorldSync, Syndigo, or GS1 GO)
- Implement real GDSN client (replacing mock)
- Manual GS1 lookup by GTIN via API
- Basic enrichment workflow: given a Product with GTIN, fetch and populate GS1 data
- Simple UI in owner console to trigger lookup

**Out of scope:**
- CIN webhook processing
- Automated sync
- Supplier import

**Dependencies:** Phase 1

**Deliverables:**
- Real GDSN client implementation
- Enrichment service implementation
- Owner console lookup UI
- Configuration for data pool credentials

---

### Phase 3 — Supplier Import & GTIN Matching

**Goal:** Import supplier catalogs and automatically match items to Products.

**Scope:**
- Supplier catalog import (CSV format first)
- GTIN extraction and validation
- Multi-stage matching pipeline:
  - Stage 1: Exact GTIN match
  - Stage 2: GTIN variants (leading zeros, format conversions)
  - Stage 3: Supplier-provided mappings
- Match confidence scoring
- Unmatched items queue for manual review
- Basic import UI

**Out of scope:**
- AI/fuzzy matching
- Real-time API sync with suppliers
- EDI/OCI integration

**Dependencies:** Phase 1, Phase 2

**Deliverables:**
- Import service and CSV parser
- GTIN matcher service
- Match review queue and UI
- Import history and audit trail

---

### Phase 4 — Media & Document Ingestion

**Goal:** Download and store product images and documents from GS1 sources.

**Scope:**
- Media download service
- Document download service
- Storage abstraction (local, S3, or Cloudinary)
- Populate ProductMedia and ProductDocument from GDSN data
- Display images in product detail views

**Out of scope:**
- OCR/text extraction from documents
- Image processing/resizing

**Dependencies:** Phase 2

**Deliverables:**
- Media downloader and storage service
- Document downloader and storage service
- Storage configuration (S3/Cloudinary)
- Updated product UI with images

---

### Phase 5 — Advanced Matching & Data Quality

**Goal:** Improve matching accuracy and implement data quality monitoring.

**Scope:**
- AI/semantic matching for items without GTINs
  - Use product name, brand, description similarity
  - OpenAI embeddings or local model
- Quality score calculation with real rules:
  - Basic data completeness
  - GS1 verification status
  - Media presence
  - Document presence
  - Regulatory compliance
- Quality dashboard in owner console
- Alerts for low-quality products

**Out of scope:**
- Full PIM (Product Information Management) functionality
- Advanced regulatory workflows

**Dependencies:** Phase 3, Phase 4

**Deliverables:**
- Fuzzy matcher implementation
- Quality score calculation service
- Quality dashboard UI
- Alert/notification system

---

### Phase 6 — GDSN Webhooks & Automated Sync

**Goal:** Receive real-time updates from GDSN and keep products synchronized.

**Scope:**
- CIN (Catalogue Item Notification) webhook handler
- Subscription management (create, update, delete subscriptions)
- Automated product updates on CIN receipt
- Delta tracking and change history
- Sync status monitoring

**Out of scope:**
- Bi-directional sync (publishing to GDSN)

**Dependencies:** Phase 2

**Deliverables:**
- Webhook endpoint for CIN
- Subscription management service and UI
- Sync status dashboard
- Change history UI

---

### Phase 7 — Production Hardening & Monitoring

**Goal:** Ensure reliability, performance, and observability for production use.

**Scope:**
- Error handling and retry logic
- Rate limiting and backoff for external APIs
- Logging and structured telemetry
- Performance optimization (caching, batch operations)
- Health checks and alerting
- Documentation and runbooks

**Out of scope:**
- New features

**Dependencies:** All previous phases

**Deliverables:**
- Production-ready error handling
- Monitoring dashboards
- Runbooks and operational documentation
- Load testing results

---

## 6. Future Extensions

The following are potential enhancements beyond the core implementation:

### Regulatory Enhancements
- Deep EUDAMED integration for EU medical devices
- FDA GUDID database sync
- Automated compliance checking against regulatory requirements
- Certificate expiration alerts

### Advanced Data Features
- Product variant management (same product, different sizes/configurations)
- Product hierarchy (kits, bundles, accessories)
- Historical pricing and trend analysis
- Predictive stock recommendations

### Integration Expansions
- EDI integration with major suppliers
- OCI punchout for supplier websites
- Real-time stock feeds from suppliers
- E-invoicing integration

### Multi-Language Support
- Product descriptions in multiple languages
- Document language variants
- Localized regulatory information

### Analytics & Reporting
- Product data quality trends over time
- Supplier performance metrics
- Catalog coverage analysis
- Cost optimization recommendations

---

## 7. Reference Information

### GS1 Resources
- [GS1 Standards](https://www.gs1.org/standards)
- [GDSN Overview](https://www.gs1.org/standards/gdsn)
- [GS1 Healthcare](https://www.gs1.org/industries/healthcare)

### Data Pool Providers
- [1WorldSync](https://www.1worldsync.com/)
- [Syndigo](https://syndigo.com/)
- [GS1 GO (Netherlands)](https://www.gs1.nl/)

### Related Zenvory Documentation
- `docs/PRODUCT_DATA_BACKBONE.md` - Existing product data architecture
- `docs/architecture/ARCHITECTURE.md` - Overall system architecture
- `docs/suppliers/` - Supplier integration documentation

---

**Document maintained by:** Engineering Team  
**Last updated:** November 27, 2025  
**Next review:** After Phase 2 completion

