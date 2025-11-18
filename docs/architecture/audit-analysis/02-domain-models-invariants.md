# Domain Models & Intended Invariants Analysis

## Overview
Analysis of domain models in `src/domain/models/` to identify intended business invariants and relationships.

---

## Orders Domain (`orders.ts`)

### Core Entities
1. **Order**: Purchase order to a supplier
2. **OrderItem**: Line item in an order
3. **OrderTemplate**: Template for recurring orders
4. **OrderTemplateItem**: Item in an order template

### Order Invariants

#### Identity & Ownership
- ✅ **INV-O-001**: Order MUST belong to exactly one Practice
- ✅ **INV-O-002**: Order MUST have exactly one creator (User)
- ✅ **INV-O-003**: Order MUST reference a Supplier (legacy) OR PracticeSupplier (Phase 2)
  - **Phase 2 Dual-Model**: Can have both supplierId and practiceSupplierId during transition

#### Status Lifecycle
- ✅ **INV-O-004**: Order status follows valid transitions:
  - `DRAFT` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED`
  - `DRAFT` → `CANCELLED`
  - `SENT` → `CANCELLED` (edge case, needs review)
- ✅ **INV-O-005**: Order with status=DRAFT MUST have sentAt=NULL
- ✅ **INV-O-006**: Order with status=SENT MUST have sentAt timestamp set
- ✅ **INV-O-007**: Order with status=RECEIVED MUST have receivedAt timestamp set
- ✅ **INV-O-008**: Only DRAFT orders can be edited (items added/removed/updated)
- ✅ **INV-O-009**: Only DRAFT orders can be deleted

#### Order Items
- ✅ **INV-O-010**: Order MUST have at least one OrderItem before being sent
- ✅ **INV-O-011**: All OrderItems MUST belong to the same Order
- ✅ **INV-O-012**: OrderItem.quantity MUST be positive (> 0)
- ✅ **INV-O-013**: OrderItem.unitPrice MAY be null (optional pricing)
- ✅ **INV-O-014**: OrderItem MUST reference a valid Item that belongs to the same Practice
- ❌ **INV-O-015**: OrderItem is unique per (orderId, itemId) - enforced by DB unique constraint
- ❌ **GAP**: No constraint preventing duplicate items with different IDs (should rely on unique constraint)

#### Cross-Entity Constraints
- ✅ **INV-O-016**: Order.practiceId MUST match Item.practiceId for all OrderItems
- ✅ **INV-O-017**: Order.supplierId MUST reference a Supplier belonging to the same Practice
- ✅ **INV-O-018**: Order.practiceSupplierId MUST reference a PracticeSupplier belonging to the same Practice
- ❌ **GAP**: No explicit validation that all items in order are available from the selected supplier

#### Business Rules
- ✅ **INV-O-019**: Cannot send order without supplier
- ✅ **INV-O-020**: Cannot send order with zero items
- ✅ **INV-O-021**: Cannot send order with any item having zero/negative quantity
- ✅ **INV-O-022**: Blocked PracticeSupplier cannot be used for new orders (Phase 2)

### OrderTemplate Invariants

#### Identity & Ownership
- ✅ **INV-OT-001**: OrderTemplate MUST belong to exactly one Practice
- ✅ **INV-OT-002**: OrderTemplate MUST have a unique name (not enforced in DB, application-level)
- ✅ **INV-OT-003**: OrderTemplate MUST have at least one OrderTemplateItem

#### Template Items
- ✅ **INV-OT-004**: OrderTemplateItem.defaultQuantity MUST be positive (> 0)
- ✅ **INV-OT-005**: OrderTemplateItem MUST reference valid Item in same Practice
- ✅ **INV-OT-006**: OrderTemplateItem.supplierId MAY be null (supplier can be chosen when creating order)
- ❌ **INV-OT-007**: OrderTemplateItem is unique per (templateId, itemId) - enforced by DB

---

## Receiving Domain (`receiving.ts`)

### Core Entities
1. **GoodsReceipt**: Record of received goods
2. **GoodsReceiptLine**: Individual item received

### GoodsReceipt Invariants

#### Identity & Ownership
- ✅ **INV-GR-001**: GoodsReceipt MUST belong to exactly one Practice
- ✅ **INV-GR-002**: GoodsReceipt MUST reference exactly one Location
- ✅ **INV-GR-003**: GoodsReceipt MUST have exactly one creator (User)
- ✅ **INV-GR-004**: GoodsReceipt MAY reference an Order (optional link)
- ✅ **INV-GR-005**: GoodsReceipt MAY reference a Supplier (optional)

#### Status Lifecycle
- ✅ **INV-GR-006**: GoodsReceipt status follows valid transitions:
  - `DRAFT` → `CONFIRMED`
  - `DRAFT` → `CANCELLED`
- ✅ **INV-GR-007**: GoodsReceipt with status=DRAFT has receivedAt=NULL
- ✅ **INV-GR-008**: GoodsReceipt with status=CONFIRMED MUST have receivedAt timestamp set
- ✅ **INV-GR-009**: Only DRAFT receipts can be edited (lines added/removed/updated)
- ✅ **INV-GR-010**: Only DRAFT receipts can be cancelled
- ✅ **INV-GR-011**: CONFIRMED receipts are immutable (cannot be edited or deleted)
- ✅ **INV-GR-012**: Only non-CONFIRMED receipts can be deleted (admin-only)

#### Receipt Lines
- ✅ **INV-GR-013**: GoodsReceipt MUST have at least one GoodsReceiptLine before confirmation
- ✅ **INV-GR-014**: GoodsReceiptLine.quantity MUST be positive (> 0)
- ✅ **INV-GR-015**: GoodsReceiptLine MUST reference a valid Item
- ✅ **INV-GR-016**: GoodsReceiptLine.batchNumber MAY be null (optional batch tracking)
- ✅ **INV-GR-017**: GoodsReceiptLine.expiryDate MAY be null (optional expiry tracking)
- ✅ **INV-GR-018**: GoodsReceiptLine.scannedGtin MAY be null (optional barcode tracking)

#### Cross-Entity Constraints
- ✅ **INV-GR-019**: If GoodsReceipt.orderId is set, Order MUST belong to same Practice
- ✅ **INV-GR-020**: If GoodsReceipt.supplierId is set, Supplier MUST belong to same Practice
- ✅ **INV-GR-021**: GoodsReceipt.locationId MUST reference a Location in the same Practice
- ✅ **INV-GR-022**: All GoodsReceiptLine items MUST belong to the same Practice

#### Inventory Impact
- ✅ **INV-GR-023**: Confirming a GoodsReceipt MUST update LocationInventory for each line
- ✅ **INV-GR-024**: Confirming a GoodsReceipt MUST create StockAdjustment records for each line
- ✅ **INV-GR-025**: Confirming a GoodsReceipt linked to an Order MUST update Order status:
  - If all items fully received → Order.status = RECEIVED
  - If some items received → Order.status = PARTIALLY_RECEIVED
- ✅ **INV-GR-026**: Confirming a GoodsReceipt MUST set receivedAt timestamp
- ❌ **GAP**: No mechanism to reverse a CONFIRMED receipt (should require admin approval)

#### Business Rules
- ✅ **INV-GR-027**: Cannot confirm receipt without lines
- ✅ **INV-GR-028**: Cannot confirm receipt with any line having zero/negative quantity
- ✅ **INV-GR-029**: Receiving quantity can exceed ordered quantity (over-delivery scenario)
- ❌ **GAP**: No validation warning when receiving quantity exceeds ordered quantity

---

## Inventory Domain (`inventory.ts`)

### Core Entities
1. **Item**: Practice-specific view of a Product
2. **LocationInventory**: Stock level at a specific location
3. **StockAdjustment**: Record of manual stock adjustment
4. **InventoryTransfer**: Transfer between locations
5. **SupplierItem**: Supplier-specific pricing for an item

### Item Invariants

#### Identity & Ownership
- ✅ **INV-I-001**: Item MUST belong to exactly one Practice
- ✅ **INV-I-002**: Item MUST reference exactly one Product
- ✅ **INV-I-003**: Item.name is required (practice-specific name, can differ from Product.name)
- ✅ **INV-I-004**: Item.sku MAY be null (practice-specific SKU)
- ✅ **INV-I-005**: Item.defaultSupplierId MAY be null (optional default supplier)
- ✅ **INV-I-006**: Item.defaultPracticeSupplierId MAY be null (Phase 2 optional)

#### Cross-Entity Constraints
- ✅ **INV-I-007**: If Item.defaultSupplierId is set, Supplier MUST belong to same Practice
- ✅ **INV-I-008**: If Item.defaultPracticeSupplierId is set, PracticeSupplier MUST belong to same Practice
- ✅ **INV-I-009**: Item.productId MUST reference a valid Product (RESTRICT on delete protects data)
- ❌ **GAP**: No enforcement that Item.name or Item.sku is unique within a Practice

### LocationInventory Invariants

#### Identity & Constraints
- ✅ **INV-LI-001**: LocationInventory is uniquely identified by (locationId, itemId)
- ✅ **INV-LI-002**: LocationInventory.quantity MUST be >= 0 (non-negative stock)
- ✅ **INV-LI-003**: LocationInventory.quantity defaults to 0
- ✅ **INV-LI-004**: LocationInventory.reorderPoint MAY be null (optional reorder alert)
- ✅ **INV-LI-005**: LocationInventory.reorderQuantity MAY be null (optional reorder amount)

#### Business Rules
- ✅ **INV-LI-006**: If reorderPoint is set, it SHOULD be >= 0
- ✅ **INV-LI-007**: If reorderQuantity is set, it SHOULD be > 0
- ✅ **INV-LI-008**: Low stock condition: quantity < reorderPoint (when reorderPoint is set)
- ❌ **GAP**: No DB constraint enforcing quantity >= 0
- ❌ **GAP**: No DB constraint enforcing reorderPoint >= 0 and reorderQuantity > 0

### StockAdjustment Invariants

#### Identity & Ownership
- ✅ **INV-SA-001**: StockAdjustment MUST belong to exactly one Practice
- ✅ **INV-SA-002**: StockAdjustment MUST reference exactly one Item
- ✅ **INV-SA-003**: StockAdjustment MUST reference exactly one Location
- ✅ **INV-SA-004**: StockAdjustment MUST have exactly one creator (User)
- ✅ **INV-SA-005**: StockAdjustment.quantity CAN be negative (for reductions) or positive (for additions)

#### Business Rules
- ✅ **INV-SA-006**: StockAdjustment.quantity MUST NOT be zero
- ✅ **INV-SA-007**: Applying StockAdjustment MUST NOT result in negative LocationInventory.quantity
- ✅ **INV-SA-008**: StockAdjustment.reason MAY be null (optional categorization)
- ✅ **INV-SA-009**: StockAdjustment.note MAY be null (optional explanation)
- ✅ **INV-SA-010**: StockAdjustment is immutable once created (audit trail)

#### Audit Trail
- ✅ **INV-SA-011**: StockAdjustment serves as audit trail for inventory changes
- ✅ **INV-SA-012**: StockAdjustment created for: manual adjustments, goods receipts, stock counts
- ❌ **GAP**: No validation that StockAdjustment.itemId and StockAdjustment.locationId belong to same Practice

### InventoryTransfer Invariants

#### Identity & Ownership
- ✅ **INV-IT-001**: InventoryTransfer MUST belong to exactly one Practice
- ✅ **INV-IT-002**: InventoryTransfer MUST reference exactly one Item
- ✅ **INV-IT-003**: InventoryTransfer MUST reference a source Location (fromLocationId)
- ✅ **INV-IT-004**: InventoryTransfer MUST reference a destination Location (toLocationId)
- ✅ **INV-IT-005**: InventoryTransfer MUST have exactly one creator (User)

#### Business Rules
- ✅ **INV-IT-006**: InventoryTransfer.quantity MUST be positive (> 0)
- ✅ **INV-IT-007**: fromLocationId MUST NOT equal toLocationId (cannot transfer to same location)
- ✅ **INV-IT-008**: Source location MUST have sufficient stock (quantity >= transfer quantity)
- ✅ **INV-IT-009**: Transfer atomically: reduces source and increases destination
- ✅ **INV-IT-010**: Both locations MUST belong to the same Practice
- ✅ **INV-IT-011**: InventoryTransfer is immutable once created (audit trail)

### SupplierItem Invariants

#### Identity & Ownership
- ✅ **INV-SI-001**: SupplierItem is uniquely identified by (supplierId, itemId)
- ✅ **INV-SI-002**: SupplierItem MUST reference a valid Supplier (legacy)
- ✅ **INV-SI-003**: SupplierItem MAY reference a PracticeSupplier (Phase 2)
- ✅ **INV-SI-004**: SupplierItem MUST reference a valid Item

#### Business Rules
- ✅ **INV-SI-005**: SupplierItem.unitPrice MAY be null (pricing optional)
- ✅ **INV-SI-006**: SupplierItem.unitPrice (if set) SHOULD be >= 0
- ✅ **INV-SI-007**: SupplierItem.minOrderQty defaults to 1
- ✅ **INV-SI-008**: SupplierItem.minOrderQty SHOULD be > 0
- ✅ **INV-SI-009**: SupplierItem.currency defaults to "EUR"
- ❌ **GAP**: No validation that Supplier and Item belong to same Practice

---

## Supplier Domain (`suppliers.ts`)

### Core Entities
1. **GlobalSupplier**: Platform-wide supplier entity
2. **PracticeSupplier**: Practice-specific supplier link with settings
3. **Supplier**: Legacy practice-specific supplier (backward compatibility)

### GlobalSupplier Invariants

#### Identity
- ✅ **INV-GS-001**: GlobalSupplier.name is required and unique platform-wide (no explicit unique constraint)
- ✅ **INV-GS-002**: GlobalSupplier.email MAY be null
- ✅ **INV-GS-003**: GlobalSupplier.phone MAY be null
- ✅ **INV-GS-004**: GlobalSupplier.website MAY be null
- ✅ **INV-GS-005**: GlobalSupplier.notes MAY be null
- ❌ **GAP**: No unique constraint on GlobalSupplier.name (could have duplicates)

### PracticeSupplier Invariants

#### Identity & Ownership
- ✅ **INV-PS-001**: PracticeSupplier uniquely links Practice to GlobalSupplier (enforced by DB)
- ✅ **INV-PS-002**: PracticeSupplier MUST reference exactly one Practice
- ✅ **INV-PS-003**: PracticeSupplier MUST reference exactly one GlobalSupplier
- ✅ **INV-PS-004**: PracticeSupplier (practiceId, globalSupplierId) pair is unique

#### Practice-Specific Settings
- ✅ **INV-PS-005**: PracticeSupplier.accountNumber MAY be null (practice's account at supplier)
- ✅ **INV-PS-006**: PracticeSupplier.customLabel MAY be null (practice-specific display name)
- ✅ **INV-PS-007**: PracticeSupplier.orderingNotes MAY be null (practice-specific notes)
- ✅ **INV-PS-008**: PracticeSupplier.isPreferred defaults to false
- ✅ **INV-PS-009**: PracticeSupplier.isBlocked defaults to false

#### Business Rules
- ✅ **INV-PS-010**: Blocked PracticeSupplier cannot be used for new Orders
- ✅ **INV-PS-011**: PracticeSupplier.migratedFromSupplierId references legacy Supplier.id
- ✅ **INV-PS-012**: During Phase 2 migration, both legacy Supplier and PracticeSupplier exist
- ❌ **GAP**: No validation preventing multiple PracticeSuppliers with same customLabel in one Practice

### Legacy Supplier Invariants

#### Identity & Ownership
- ✅ **INV-LS-001**: Supplier MUST belong to exactly one Practice
- ✅ **INV-LS-002**: Supplier.name is required
- ✅ **INV-LS-003**: Supplier.email, phone, website, notes MAY be null
- ❌ **GAP**: No unique constraint on (practiceId, name) - could have duplicate supplier names

#### Backward Compatibility
- ✅ **INV-LS-004**: Legacy Supplier continues to work during Phase 2 migration
- ✅ **INV-LS-005**: New Orders can use either Supplier or PracticeSupplier
- ✅ **INV-LS-006**: PracticeSupplier.migratedFromSupplierId links to original Supplier
- ❌ **GAP**: No validation ensuring Supplier and linked PracticeSupplier belong to same Practice

---

## Products Domain (`products.ts`)

### Core Entities
1. **Product**: Canonical product data (GS1-driven, shared across practices)
2. **SupplierCatalog**: Links suppliers to products with pricing and integration details

### Product Invariants

#### Identity
- ✅ **INV-PR-001**: Product.name is required
- ✅ **INV-PR-002**: Product.gtin MAY be null (nullable, but should be unique if set)
- ✅ **INV-PR-003**: Product.gtin is unique (enforced by DB unique constraint)
- ✅ **INV-PR-004**: Product.brand MAY be null
- ✅ **INV-PR-005**: Product.description MAY be null

#### GS1 Integration
- ✅ **INV-PR-006**: Product.isGs1Product defaults to false
- ✅ **INV-PR-007**: Product.gs1VerificationStatus defaults to UNVERIFIED
- ✅ **INV-PR-008**: Valid gs1VerificationStatus values: UNVERIFIED, PENDING, VERIFIED, FAILED, EXPIRED
- ✅ **INV-PR-009**: If Product.isGs1Product=true, gtin SHOULD be set
- ✅ **INV-PR-010**: If gs1VerificationStatus=VERIFIED, gs1VerifiedAt SHOULD be set
- ✅ **INV-PR-011**: Product.gs1Data MAY be null (raw GS1 API response)
- ❌ **GAP**: No validation ensuring isGs1Product=true implies gtin is set

#### Lifecycle
- ✅ **INV-PR-012**: Product can be shared across multiple Practices via Items
- ✅ **INV-PR-013**: Product cannot be deleted if Items exist (RESTRICT constraint)
- ✅ **INV-PR-014**: Product is platform-wide, not practice-specific

### SupplierCatalog Invariants

#### Identity & Ownership
- ✅ **INV-SC-001**: SupplierCatalog uniquely links (supplierId, productId) - enforced by DB
- ✅ **INV-SC-002**: SupplierCatalog MUST reference a Supplier (legacy)
- ✅ **INV-SC-003**: SupplierCatalog MAY reference a PracticeSupplier (Phase 2)
- ✅ **INV-SC-004**: SupplierCatalog MUST reference a Product
- ✅ **INV-SC-005**: SupplierCatalog.supplierSku MAY be null (supplier's SKU)

#### Pricing & Integration
- ✅ **INV-SC-006**: SupplierCatalog.unitPrice MAY be null
- ✅ **INV-SC-007**: SupplierCatalog.currency defaults to "EUR"
- ✅ **INV-SC-008**: SupplierCatalog.minOrderQty defaults to 1
- ✅ **INV-SC-009**: SupplierCatalog.integrationType defaults to MANUAL
- ✅ **INV-SC-010**: Valid integrationType values: MANUAL, API, EDI, OCI, CSV
- ✅ **INV-SC-011**: SupplierCatalog.integrationConfig stores integration settings (JSON)
- ✅ **INV-SC-012**: SupplierCatalog.lastSyncAt tracks last sync timestamp
- ✅ **INV-SC-013**: SupplierCatalog.isActive defaults to true

#### Business Rules
- ✅ **INV-SC-014**: Only isActive=true entries should appear in catalog searches
- ✅ **INV-SC-015**: SupplierCatalog enables multiple suppliers for same Product
- ✅ **INV-SC-016**: Practice can add Item from SupplierCatalog if accessible via PracticeSupplier
- ❌ **GAP**: No validation ensuring supplierId and practiceSupplierId are consistent

---

## Summary of Invariant Categories

### Well-Enforced Invariants
1. **Foreign Key Integrity**: Most relationships properly enforced with FKs
2. **Unique Constraints**: Composite unique keys prevent duplicates (OrderItem, SupplierItem, etc.)
3. **Enum Constraints**: Status values limited to valid enums
4. **Service-Level Validations**: Status transitions, positive quantities validated in services

### Partially Enforced Invariants
1. **Status-Dependent Fields**: Enforced in service layer, not in DB (sentAt, receivedAt)
2. **Positive Quantities**: Validated in service, no DB CHECK constraint
3. **Cross-Practice Isolation**: Mostly enforced via FKs, some gaps in validation
4. **Supplier Resolution**: Dual-model (Supplier/PracticeSupplier) handled in service layer

### Gap Areas (No Enforcement)
1. **Aggregate Constraints**: "Order must have at least one item" - no DB constraint
2. **Calculation Invariants**: Inventory = sum of movements - no DB constraint
3. **Business Rule Transitions**: Status transitions not enforced at DB level
4. **Cross-Entity Field Matching**: GoodsReceipt.practiceId = Order.practiceId - no DB constraint
5. **Uniqueness within Practice**: Item names, SKUs, Supplier names not unique

---

## Phase 2 Dual-Supplier Model Considerations

### Transition Strategy
- Both legacy `Supplier` and new `GlobalSupplier + PracticeSupplier` coexist
- `migratedFromSupplierId` links PracticeSupplier to original Supplier
- Service layer resolves which supplier model to use

### Invariants During Transition
- ✅ **INV-PHASE2-001**: Order can have either supplierId OR practiceSupplierId OR both
- ✅ **INV-PHASE2-002**: If PracticeSupplier provided, legacy supplierId derived from migration tracking
- ✅ **INV-PHASE2-003**: SupplierCatalog can reference either Supplier or PracticeSupplier
- ❌ **GAP**: No validation preventing inconsistent supplier references

### Post-Migration Invariants (Phase 3+)
- Future: Deprecate legacy Supplier model
- Future: Make practiceSupplierId required on Order
- Future: Remove supplierId from Order, SupplierCatalog

---

## Recommendations for Domain Model Improvements

### High Priority
1. Add validation helper methods to domain models (e.g., `Order.canBeSent()`, `GoodsReceipt.canBeConfirmed()`)
2. Document status transition diagrams in code comments
3. Add JSDoc comments for all invariants in TypeScript interfaces
4. Create domain event types for state transitions (for audit/notification)

### Medium Priority
1. Add computed properties for common checks (e.g., `Order.isEditable`, `GoodsReceipt.isImmutable`)
2. Create value objects for complex types (e.g., `Quantity`, `Price`, `GTIN`)
3. Add factory methods for safe entity creation (e.g., `Order.createDraft()`)

### Low Priority
1. Consider using branded types for IDs (e.g., `type OrderId = string & { __brand: 'OrderId' }`)
2. Add serialization/deserialization helpers for API boundaries
3. Create aggregate root pattern for complex entities (Order + OrderItems)

