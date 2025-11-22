# Product Data Backbone Architecture

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Status**: Production Architecture

---

## Executive Summary

Venzory's product data architecture is built on a **three-layer model** that separates concerns between platform-level canonical data, supplier-specific catalogs, and practice-specific inventory items. This design enables:

- **Centralized product master data** for data quality and consistency
- **Multi-supplier pricing** without data duplication
- **Practice autonomy** for custom naming and stock management
- **Future extensibility** for supplier portals and integrations

---

## Table of Contents

1. [The Three Layers](#the-three-layers)
2. [Ownership & Permissions Model](#ownership--permissions-model)
3. [Database Schema Mapping](#database-schema-mapping)
4. [Data Flow Examples](#data-flow-examples)
5. [Future Extensions](#future-extensions)
6. [Architectural Decisions](#architectural-decisions)

---

## The Three Layers

### Layer 1: Global Product Master Data (Platform-Level)

**Purpose**: Single source of truth for canonical product information.

**Key Characteristics**:
- Shared across **all practices** on the platform
- Based on **GS1 standards** where applicable (GTIN/barcode)
- Owned and maintained by **platform owner only**
- Immutable from practice perspective (no practice can edit)

**Data Includes**:
- GTIN (Global Trade Item Number) - unique identifier
- Brand name
- Product name (canonical)
- Product description
- GS1 verification status
- Raw GS1 API data (for reference)

**Model**: `Product`

```prisma
model Product {
  id                    String                @id @default(cuid())
  gtin                  String?               @unique
  brand                 String?
  name                  String
  description           String?
  isGs1Product          Boolean               @default(false)
  gs1VerificationStatus Gs1VerificationStatus @default(UNVERIFIED)
  gs1VerifiedAt         DateTime?
  gs1Data               Json?
  // ... timestamps
}
```

**Protection**: 
- Foreign key with `RESTRICT` on Item → Product prevents deletion of Products that are in use
- Only accessible via owner console/admin tools

---

### Layer 2: Supplier Catalog (Per-Supplier, Linked to Master)

**Purpose**: Links suppliers to canonical products with supplier-specific terms.

**Key Characteristics**:
- Each **supplier** can offer the **same Product** with different pricing
- Enables multiple suppliers selling identical products (by GTIN)
- Supplier-specific SKU, pricing, and ordering terms
- Integration metadata (API endpoints, EDI settings, OCI params)

**Data Includes**:
- Link to Product (canonical)
- Link to Supplier (via PracticeSupplier)
- Supplier's own SKU for this product
- Unit price and currency
- Minimum order quantity
- Integration type (MANUAL, API, EDI, OCI, CSV)
- Integration configuration (JSON)
- Active/inactive flag

**Models**: `SupplierCatalog`, `GlobalSupplier`, `PracticeSupplier`

```prisma
model SupplierCatalog {
  id                 String          @id @default(cuid())
  practiceSupplierId String          // Links to PracticeSupplier
  productId          String          // Links to Product (Layer 1)
  supplierSku        String?
  unitPrice          Decimal?
  currency           String?         @default("EUR")
  minOrderQty        Int?            @default(1)
  integrationType    IntegrationType @default(MANUAL)
  integrationConfig  Json?
  lastSyncAt         DateTime?
  isActive           Boolean         @default(true)
  // ... timestamps
  
  @@unique([practiceSupplierId, productId]) // One entry per supplier-product pair
}
```

**Supplier Hierarchy**:

```
GlobalSupplier (platform-wide)
    ↓
PracticeSupplier (practice-specific link)
    ↓
SupplierCatalog (product offerings)
```

**Protection**:
- Unique constraint on (practiceSupplierId, productId) prevents duplicate catalog entries
- CASCADE delete when supplier removed
- Can only be populated via owner-managed bulk imports or future supplier portal

---

### Layer 3: Practice Items (Clinic-Specific Inventory)

**Purpose**: Practice-specific view of products with custom naming and stock settings.

**Key Characteristics**:
- Each **practice** gets their own `Item` for each `Product` they want to order
- Practice can customize name, SKU, description, and unit
- Links to default supplier for quick reordering
- Used for all inventory operations (stock levels, transfers, ordering)

**Data Includes**:
- Link to Product (canonical)
- Link to Practice (ownership)
- Practice-specific name (can override Product name)
- Practice-specific SKU
- Practice-specific description
- Practice-specific unit of measure
- Default supplier selection

**Model**: `Item`

```prisma
model Item {
  id                        String   @id @default(cuid())
  practiceId                String
  productId                 String   // Links to Product (Layer 1)
  defaultPracticeSupplierId String?  // Default supplier for this item
  name                      String   // Practice can override Product name
  sku                       String?  // Practice-specific SKU
  description               String?
  unit                      String?
  // ... timestamps
  
  practice                Practice
  product                 Product
  defaultPracticeSupplier PracticeSupplier?
  inventory               LocationInventory[]  // Stock levels per location
  supplierItems           SupplierItem[]       // Supplier-specific pricing overrides
  
  @@unique([practiceId, name])  // Unique item names within practice
  @@index([practiceId, sku])     // Partial unique on SKU
}
```

**Related Models**:
- `LocationInventory`: Stock levels per location for this item
- `SupplierItem`: Practice-specific supplier pricing overrides
- `OrderItem`: Line items in orders
- `GoodsReceiptLine`: Receiving records
- `StockAdjustment`: Audit trail for stock changes

**Protection**:
- Unique constraint on (practiceId, name) ensures no duplicate items in practice
- CASCADE delete when practice removed
- RESTRICT on Product deletion (cannot delete Product if Items exist)

---

## Ownership & Permissions Model

### Platform Owner (Admin)

**Full Control Over**:
1. **Product Master Data**:
   - Create/update/delete Products
   - Import products via bulk CSV/API
   - Verify GS1 data
   - Manage product attributes

2. **Global Supplier Registry**:
   - Create/update GlobalSupplier records
   - Manage platform-wide supplier information

3. **Supplier Catalogs**:
   - Populate SupplierCatalog via bulk imports
   - Update supplier pricing and terms
   - Configure integrations (EDI, API, OCI)

**Implementation**:
- Owner Console at `/owner` (role-gated)
- Bulk import tools (CSV, API integrations)
- GS1 lookup integration
- Audit logging for all changes

**Rationale**:
- Centralized data quality control
- Prevents duplicate/conflicting product data
- Enables consistent product matching across practices
- Foundation for future marketplace features

---

### Suppliers (Future: Supplier Portal)

**Future Permissions** (not currently implemented):
1. **Their Own Catalog**:
   - Update pricing for their products
   - Add/remove products from their catalog
   - Update supplier SKU and terms
   - Configure integration settings

2. **Cannot Access**:
   - Other suppliers' data
   - Practice-specific data
   - Product master data (read-only)

**Implementation Plan**:
- Supplier login/authentication
- Supplier portal UI
- API for supplier catalog management
- Audit trail for supplier changes

---

### Practices (Clinics)

**Can Manage**:
1. **Their Own Items**:
   - Enable/disable products from supplier catalogs (creates Item)
   - Customize item name, SKU, description
   - Set default supplier per item
   - Manage stock levels and reorder settings

2. **Ordering Preferences**:
   - Create order templates
   - Mark suppliers as preferred
   - Block specific suppliers
   - Set supplier account numbers and notes

3. **Inventory Operations**:
   - Stock adjustments
   - Transfers between locations
   - Receiving goods
   - Stock counts

**Cannot Do**:
1. **Import Raw Product Data**:
   - Cannot create Products directly
   - Cannot modify Product master data
   - Cannot create SupplierCatalog entries

2. **Access Other Practices**:
   - Strict practice-level isolation
   - No cross-practice data visibility

**Rationale**:
- Practices are **consumers** of product data, not publishers
- Maintains data quality and consistency
- Prevents duplicate/conflicting product entries
- Enables safe multi-tenancy

---

## Database Schema Mapping

### Current Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 1: MASTER DATA                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Product                                                   │  │
│  │ - id (PK)                                                │  │
│  │ - gtin (UNIQUE)                                          │  │
│  │ - name                                                   │  │
│  │ - brand                                                  │  │
│  │ - isGs1Product                                           │  │
│  │ - gs1VerificationStatus                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 2: SUPPLIER CATALOG                     │
│                                                                 │
│  ┌─────────────────────────┐      ┌──────────────────────────┐ │
│  │ GlobalSupplier          │      │ PracticeSupplier        │ │
│  │ - id (PK)              │      │ - id (PK)               │ │
│  │ - name (UNIQUE)        │──┐   │ - practiceId (FK)       │ │
│  │ - email                │  └──→│ - globalSupplierId (FK) │ │
│  │ - phone                │      │ - accountNumber         │ │
│  └─────────────────────────┘      │ - customLabel           │ │
│                                   │ - isPreferred           │ │
│                                   └──────────────────────────┘ │
│                                            ↓                    │
│                              ┌──────────────────────────────┐  │
│                              │ SupplierCatalog              │  │
│                              │ - id (PK)                    │  │
│                              │ - practiceSupplierId (FK)    │  │
│                              │ - productId (FK)             │  │
│                              │ - supplierSku                │  │
│                              │ - unitPrice                  │  │
│                              │ - minOrderQty                │  │
│                              │ - integrationType            │  │
│                              └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 3: PRACTICE ITEMS                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Item                                                      │  │
│  │ - id (PK)                                                │  │
│  │ - practiceId (FK)                                        │  │
│  │ - productId (FK) ────────────┐                          │  │
│  │ - defaultPracticeSupplierId  │                          │  │
│  │ - name (practice-specific)   │                          │  │
│  │ - sku (practice-specific)    │                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                   ↓                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SupplierItem (practice-specific pricing override)        │  │
│  │ - id (PK)                                                │  │
│  │ - practiceSupplierId (FK)                                │  │
│  │ - itemId (FK)                                            │  │
│  │ - supplierSku                                            │  │
│  │ - unitPrice (override)                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                   ↓                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LocationInventory (stock per location)                   │  │
│  │ - locationId (PK, FK)                                    │  │
│  │ - itemId (PK, FK)                                        │  │
│  │ - quantity                                               │  │
│  │ - reorderPoint                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Foreign Key Relationships

**Protection & Cascades**:

```typescript
// Layer 1 → Layer 3 (RESTRICT - protect master data)
Item.productId → Product.id (onDelete: RESTRICT)
// Cannot delete Product if any practice has Items for it

// Layer 2 → Layer 1 (CASCADE - catalog follows product)
SupplierCatalog.productId → Product.id (onDelete: CASCADE)
// Deleting Product removes all supplier catalog entries

// Layer 2 → Supplier (CASCADE - catalog follows supplier)
SupplierCatalog.practiceSupplierId → PracticeSupplier.id (onDelete: CASCADE)
// Deleting PracticeSupplier removes all catalog entries

// Layer 3 → Practice (CASCADE - items follow practice)
Item.practiceId → Practice.id (onDelete: CASCADE)
// Deleting Practice removes all their items

// Layer 3 → Layer 3 (CASCADE - stock follows item)
LocationInventory.itemId → Item.id (onDelete: CASCADE)
// Deleting Item removes all stock records
```

---

### Schema Gaps & Future Considerations

**Current Gaps**:

1. **SupplierCatalog per Practice vs Global**:
   - Current: `SupplierCatalog` links to `PracticeSupplier` (practice-specific)
   - Gap: Same supplier might have same catalog for all practices
   - Consideration: Could normalize to GlobalSupplier-level catalog, but practice-specific pricing is common in healthcare

2. **SupplierItem Duplication**:
   - `SupplierItem` allows practice-specific pricing overrides
   - Some data overlap with `SupplierCatalog`
   - Rationale: Practices need ability to negotiate custom pricing per supplier

3. **Product Variants**:
   - No formal variant model (e.g., same product in different sizes)
   - Current: Each variant is separate Product with distinct GTIN
   - Future: Consider variant grouping for better UX

4. **Product Categories/Taxonomy**:
   - No category or classification system
   - Current: Relies on name/description search
   - Future: Add product categories, tags, or GS1 GPC (Global Product Classification)

---

## Data Flow Examples

### Example 1: Owner Imports Products & Catalog

```
1. Owner uploads CSV with products:
   GTIN         | Brand      | Name
   5060123456789| PharmaCo   | Paracetamol 500mg

2. System creates Product:
   id: prod_xyz123
   gtin: "5060123456789"
   brand: "PharmaCo"
   name: "Paracetamol 500mg"
   isGs1Product: true

3. Owner uploads supplier catalog:
   Supplier         | GTIN         | SKU    | Price
   "MedSupply Ltd" | 5060123456789| MS-1234| 12.50

4. System creates:
   - GlobalSupplier: "MedSupply Ltd"
   - SupplierCatalog linking to Product prod_xyz123

Result: Product and catalog ready for all practices
```

---

### Example 2: Practice Adds Item to Inventory

```
1. Practice "Clinic A" user browses available supplier catalogs
   - Sees "MedSupply Ltd" offers "Paracetamol 500mg"

2. User clicks "Add to Inventory"

3. System creates Item:
   id: item_abc456
   practiceId: "clinic_a"
   productId: "prod_xyz123"
   name: "Paracetamol 500mg" (default from Product)
   sku: null (practice can set later)
   defaultPracticeSupplierId: "prsupp_medsupply_clinica"

4. User customizes:
   - name → "Para 500"
   - sku → "PARA-500"
   - unit → "Box of 100"

5. System creates LocationInventory:
   locationId: "clinic_a_main"
   itemId: "item_abc456"
   quantity: 0
   reorderPoint: 10
   reorderQuantity: 50

Result: Practice can now order, receive, and track stock
```

---

### Example 3: Practice Orders from Supplier

```
1. Practice creates Order:
   practiceId: "clinic_a"
   practiceSupplierId: "prsupp_medsupply_clinica"
   status: DRAFT

2. Adds OrderItem:
   orderId: "order_123"
   itemId: "item_abc456" (Paracetamol)
   quantity: 100
   unitPrice: 12.50 (from SupplierCatalog)

3. Sends Order (DRAFT → SENT)

4. Receives goods via GoodsReceipt:
   locationId: "clinic_a_main"
   orderId: "order_123"
   lines:
     - itemId: "item_abc456"
       quantity: 100
       batchNumber: "BATCH2025"
       expiryDate: "2026-12-31"

5. Confirms GoodsReceipt (DRAFT → CONFIRMED):
   - Updates LocationInventory.quantity: 0 → 100
   - Creates StockAdjustment audit record
   - Updates Order.status: SENT → RECEIVED

Result: Inventory updated, audit trail complete
```

---

## Future Extensions

### 1. Supplier Portal

**Goal**: Allow suppliers to maintain their own catalogs without owner intervention.

**Features**:
- Supplier login/authentication
- View/edit their SupplierCatalog entries
- Update pricing, SKUs, availability
- Upload product images and documents
- View which practices are ordering their products (anonymized)

**Implementation Approach**:

```
1. Add Supplier User Model:
   - SupplierUser (email, password, globalSupplierId)
   - Authentication via NextAuth

2. Create Supplier Portal Routes:
   - /supplier/login
   - /supplier/dashboard
   - /supplier/catalog
   - /supplier/orders (aggregated, anonymized)

3. Permission Guards:
   - Supplier can only see/edit their own GlobalSupplier
   - Can only modify SupplierCatalog for their supplierId
   - No access to practice-specific data

4. Audit Trail:
   - Log all supplier catalog changes
   - Owner can review/approve changes (optional)
```

**Database Changes**:

```prisma
model SupplierUser {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  globalSupplierId String
  role             SupplierRole @default(STAFF)
  createdAt        DateTime @default(now())
  
  globalSupplier GlobalSupplier @relation(fields: [globalSupplierId], references: [id], onDelete: Cascade)
}

enum SupplierRole {
  ADMIN   // Can manage supplier settings and users
  STAFF   // Can edit catalog
  VIEWER  // Read-only
}
```

**No Breaking Changes**:
- Existing owner-managed imports continue to work
- Supplier portal is additive functionality
- Practices unaffected (continue using catalogs as-is)

---

### 2. Product Enrichment Pipeline

**Goal**: Automatically enrich Product data from external sources.

**Features**:
- Automatic GS1 lookups on GTIN entry
- Product image fetching from GS1 or supplier APIs
- Safety data sheet (SDS) linking
- Regulatory information (CE marking, FDA approval)

**Implementation**:

```typescript
// Background job
async function enrichProduct(productId: string) {
  const product = await getProduct(productId);
  
  if (product.gtin && !product.gs1Data) {
    // Call GS1 API
    const gs1Data = await fetchGS1Data(product.gtin);
    
    await updateProduct(productId, {
      gs1Data: gs1Data,
      gs1VerificationStatus: 'VERIFIED',
      gs1VerifiedAt: new Date(),
      // Enrich from GS1
      brand: gs1Data.brand || product.brand,
      description: gs1Data.description || product.description,
    });
  }
  
  // Fetch product images
  const images = await fetchProductImages(product.gtin);
  await addProductImages(productId, images);
}
```

---

### 3. Catalog Synchronization

**Goal**: Auto-sync supplier catalogs via API/EDI.

**Features**:
- Scheduled jobs to poll supplier APIs
- EDI integration for large suppliers
- OCI punchout for supplier websites
- Automatic price updates

**Implementation**:

```typescript
// Integration config in SupplierCatalog.integrationConfig
{
  "type": "API",
  "endpoint": "https://api.supplier.com/v1/catalog",
  "apiKey": "...",
  "syncFrequency": "daily",
  "lastSync": "2025-11-20T10:00:00Z"
}

// Background job
async function syncSupplierCatalog(catalogId: string) {
  const catalog = await getSupplierCatalog(catalogId);
  
  if (catalog.integrationType === 'API') {
    const response = await fetch(catalog.integrationConfig.endpoint, {
      headers: { Authorization: `Bearer ${catalog.integrationConfig.apiKey}` }
    });
    
    const supplierProducts = await response.json();
    
    for (const supplierProduct of supplierProducts) {
      // Match by GTIN to existing Product
      const product = await findProductByGtin(supplierProduct.gtin);
      
      if (product) {
        // Update catalog entry
        await updateSupplierCatalog(catalogId, {
          supplierSku: supplierProduct.sku,
          unitPrice: supplierProduct.price,
          minOrderQty: supplierProduct.minQty,
          isActive: supplierProduct.available,
          lastSyncAt: new Date(),
        });
      }
    }
  }
}
```

---

### 4. Multi-Practice Catalog Sharing

**Goal**: Allow practices to share custom catalogs with each other (opt-in).

**Use Case**: Chain of clinics wants to standardize on common items.

**Implementation**:

```prisma
model CatalogTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String   // Practice that created template
  isPublic    Boolean  @default(false)
  items       CatalogTemplateItem[]
  
  owner Practice @relation(fields: [ownerId], references: [id])
}

model CatalogTemplateItem {
  id         String @id @default(cuid())
  templateId String
  productId  String
  name       String?  // Optional custom name
  
  template CatalogTemplate @relation(fields: [templateId], references: [id])
  product  Product @relation(fields: [productId], references: [id])
}

model PracticeCatalogSubscription {
  practiceId String
  templateId String
  
  practice Practice @relation(fields: [practiceId], references: [id])
  template CatalogTemplate @relation(fields: [templateId], references: [id])
  
  @@id([practiceId, templateId])
}
```

**Workflow**:
1. Practice A creates CatalogTemplate with 50 common items
2. Marks template as public
3. Practice B browses templates and subscribes
4. Practice B can "Add All Items from Template" to create Items in bulk
5. Each practice still has their own Items (full customization)

---

## Architectural Decisions

### Why Three Layers Instead of Two?

**Decision**: Separate Product (master) from Item (practice-specific).

**Rationale**:
1. **Data Quality**: Centralized master data prevents duplicate/conflicting products
2. **Multi-Tenancy**: Clean separation of shared vs tenant data
3. **Customization**: Practices need custom names/SKUs without polluting master data
4. **Integration**: Master data enables Magento sync, future marketplace features

**Trade-off**:
- More complexity vs direct practice-to-product model
- Additional layer of indirection
- Worth it for data quality and future extensibility

---

### Why PracticeSupplier as Intermediary?

**Decision**: GlobalSupplier + PracticeSupplier instead of just Supplier.

**Rationale**:
1. **Avoid Duplication**: One GlobalSupplier record instead of N identical Supplier records
2. **Practice Autonomy**: Each practice can customize supplier label, account number, notes
3. **Supplier Portal**: GlobalSupplier is the identity for future supplier login
4. **Reporting**: Easier to aggregate orders across practices per global supplier

**Trade-off**:
- More complex than single Supplier model
- Migration path for legacy Supplier records
- Worth it for scalability and future supplier portal

---

### Why SupplierCatalog Links to PracticeSupplier Not GlobalSupplier?

**Decision**: SupplierCatalog has FK to PracticeSupplier, not directly to GlobalSupplier.

**Rationale**:
1. **Practice-Specific Pricing**: Suppliers often have different prices per customer
2. **Negotiated Terms**: Allows per-practice contract terms
3. **Catalog Visibility**: Practice only sees catalogs for suppliers they have relationship with

**Alternative Considered**: GlobalSupplier-level catalog with practice-specific overrides.
- Rejected: More complexity, healthcare pricing is very customer-specific

---

### Why Can't Practices Import Products?

**Decision**: Only owner can create Products and SupplierCatalog entries.

**Rationale**:
1. **Data Quality**: Prevents duplicate products with slight name variations
2. **GTIN Integrity**: Ensures proper GS1 validation and uniqueness
3. **Integration Safety**: Magento sync requires clean, validated product data
4. **Future Marketplace**: Foundation for cross-practice product discovery

**Trade-off**:
- Less autonomy for practices
- Owner must handle import requests
- Worth it for data quality and integration reliability

**Future Mitigation**: Practices could "request" new products via form, triggering owner review.

---

### Why RESTRICT on Product Deletion?

**Decision**: Cannot delete Product if any practice has Items for it.

**Rationale**:
1. **Audit Trail**: Preserve historical data (orders, receipts)
2. **Data Integrity**: Prevent orphaned Items
3. **Safety**: Deletion should be rare and careful

**Alternative Considered**: Soft delete (deletedAt flag).
- May implement in future for better UX

---

## Summary & Key Takeaways

### For Senior Developers

**Mental Model**:
```
Product (shared, immutable) 
  → SupplierCatalog (per-supplier pricing) 
    → Item (per-practice inventory)
      → LocationInventory (stock per location)
```

**Key Rules**:
1. Product is **read-only** for practices (write via owner console only)
2. Item is the **working entity** for all practice operations
3. GTIN uniqueness is **critical** for integrations
4. Practice isolation is **strict** (never cross practice boundaries)

**Code Guidelines**:
- Always go through `Item` for inventory operations
- Never let practice mutate `Product` directly
- Validate GTIN on Product creation (use `validateGtin()`)
- Use transactions for inventory updates
- Respect foreign key constraints (especially RESTRICT on Product)

---

### For Product Owner

**Business Value**:
- **Centralized Data Quality**: One source of truth for products
- **Multi-Supplier Flexibility**: Compare pricing across suppliers easily
- **Practice Autonomy**: Clinics can customize without breaking shared data
- **Integration Ready**: Clean data model for Magento, suppliers, etc.
- **Future Proof**: Foundation for marketplace, supplier portal, procurement optimization

**Limitations**:
- Practices cannot self-service add new products (owner gatekeeping)
- Supplier onboarding requires owner effort (until supplier portal)
- Product matching requires accurate GTINs (data quality dependent on suppliers)

**Next Steps**:
1. Implement owner console bulk import tools
2. Establish product data quality processes
3. Plan supplier portal for Q2
4. Consider product request workflow for practices

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-22  
**Maintained By**: Engineering & Product Team  
**Next Review**: After Supplier Portal implementation

