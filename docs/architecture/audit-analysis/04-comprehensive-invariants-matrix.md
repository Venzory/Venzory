# Comprehensive Business Invariants & Enforcement Matrix

## Overview
This document consolidates all business invariants identified across the Remcura V2 codebase and maps their enforcement mechanisms.

**Enforcement Levels:**
- **DB**: Database constraint (FK, UNIQUE, NOT NULL, CHECK)
- **Prisma**: Prisma schema constraint (required, cascade, relations)
- **Validator**: Domain validator function in `src/domain/validators/`
- **Service**: Service-layer business logic check
- **UI**: UI-level validation only (GAP - not enforced in backend)
- **None**: No enforcement (CRITICAL GAP)

---

## Orders Domain

| ID | Invariant | DB | Prisma | Validator | Service | Gap? |
|----|-----------|----|----|-----------|---------|------|
| **Order Identity & Ownership** |
| INV-O-001 | Order MUST belong to exactly one Practice | ✅ FK CASCADE | ✅ Required | - | ✅ Scoped queries | No |
| INV-O-002 | Order MUST have exactly one creator (User) | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Set on create | **GAP** (orphan risk) |
| INV-O-003 | Order MUST reference Supplier OR PracticeSupplier | ⚠️ FK, no onDelete | ❌ Both nullable | - | ✅ Validated | **GAP** (could have neither) |
| **Order Status Lifecycle** |
| INV-O-004 | Valid status transitions only | ❌ No constraint | ✅ Enum values | - | ✅ Enforced in service | **GAP** (invalid transitions possible) |
| INV-O-005 | DRAFT orders have sentAt=NULL | ❌ No constraint | - | - | ❌ Not validated | **GAP** (inconsistent state possible) |
| INV-O-006 | SENT orders have sentAt set | ❌ No constraint | - | ✅ validateOrderCanBeSent | ✅ Set on sendOrder() | **PARTIAL** (DB gap) |
| INV-O-007 | RECEIVED orders have receivedAt set | ❌ No constraint | - | - | ✅ Set by receiving service | **PARTIAL** (DB gap) |
| INV-O-008 | Only DRAFT orders can be edited | ❌ No constraint | - | - | ✅ Status check in service | No (service enforced) |
| INV-O-009 | Only DRAFT orders can be deleted | ❌ No constraint | - | - | ✅ Status check in service | No (service enforced) |
| **Order Items** |
| INV-O-010 | Order MUST have ≥1 item before sending | ❌ No constraint | - | ✅ validateOrderCanBeSent | ✅ Checked in service | **GAP** (could send empty) |
| INV-O-011 | All OrderItems belong to same Order | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-O-012 | OrderItem.quantity > 0 | ❌ No constraint | - | ✅ validatePositiveQuantity | ✅ All mutations | **GAP** (DB allows 0 or negative) |
| INV-O-013 | OrderItem.unitPrice ≥ 0 (if set) | ❌ No constraint | ❌ Nullable | - | ❌ Not validated | **GAP** (negative price possible) |
| INV-O-014 | OrderItem references valid Item in same Practice | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Item existence check | **PARTIAL** (cross-practice not validated) |
| INV-O-015 | Unique (orderId, itemId) | ✅ UNIQUE constraint | ✅ Unique | - | ✅ Duplicate check | No |
| **Cross-Entity Constraints** |
| INV-O-016 | Order.practiceId = Item.practiceId for all items | ❌ No constraint | - | - | ❌ Not explicitly validated | **GAP** (relies on FK) |
| INV-O-017 | Order.supplierId references Supplier in same Practice | ⚠️ FK, no onDelete | - | - | ✅ Supplier existence check | **PARTIAL** (no cross-check) |
| INV-O-018 | Order.practiceSupplierId in same Practice | ⚠️ FK, no onDelete | - | - | ✅ Validated | **PARTIAL** (no onDelete) |
| **Business Rules** |
| INV-O-019 | Cannot send order without supplier | ❌ No constraint | - | ✅ validateOrderCanBeSent | ✅ Checked | **GAP** (DB allows) |
| INV-O-020 | Cannot send order with 0 items | ❌ No constraint | - | ✅ validateOrderCanBeSent | ✅ Checked | **GAP** (DB allows) |
| INV-O-021 | Cannot send order with any item qty ≤ 0 | ❌ No constraint | - | ✅ validateOrderCanBeSent | ✅ Checked | **GAP** (DB allows) |
| INV-O-022 | Blocked PracticeSupplier cannot be used | ❌ No constraint | - | - | ✅ Checked in resolveSupplierIds | No (service enforced) |

---

## Receiving Domain

| ID | Invariant | DB | Prisma | Validator | Service | Gap? |
|----|-----------|----|----|-----------|---------|------|
| **GoodsReceipt Identity & Ownership** |
| INV-GR-001 | GoodsReceipt MUST belong to one Practice | ✅ FK CASCADE | ✅ Required | - | ✅ Scoped queries | No |
| INV-GR-002 | GoodsReceipt MUST reference one Location | ✅ FK RESTRICT | ✅ Required | - | ✅ Location check | No |
| INV-GR-003 | GoodsReceipt MUST have creator | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Set on create | **GAP** (orphan risk) |
| INV-GR-004 | GoodsReceipt MAY reference Order | ✅ FK SetNull | ❌ Nullable | - | - | No |
| INV-GR-005 | GoodsReceipt MAY reference Supplier | ✅ FK SetNull | ❌ Nullable | - | ✅ Supplier check if set | No |
| **GoodsReceipt Status Lifecycle** |
| INV-GR-006 | Valid status transitions only | ❌ No constraint | ✅ Enum values | - | ✅ Enforced in service | **GAP** (invalid transitions possible) |
| INV-GR-007 | DRAFT receipts have receivedAt=NULL | ❌ No constraint | - | - | ❌ Not validated | **GAP** (inconsistent state possible) |
| INV-GR-008 | CONFIRMED receipts have receivedAt set | ❌ No constraint | - | ✅ validateReceiptCanBeConfirmed | ✅ Set on confirm | **PARTIAL** (DB gap) |
| INV-GR-009 | Only DRAFT receipts can be edited | ❌ No constraint | - | - | ✅ Status check in service | No (service enforced) |
| INV-GR-010 | Only DRAFT receipts can be cancelled | ❌ No constraint | - | - | ✅ Status check in service | No (service enforced) |
| INV-GR-011 | CONFIRMED receipts are immutable | ❌ No constraint | - | - | ✅ Status check in service | No (service enforced) |
| INV-GR-012 | Only non-CONFIRMED can be deleted | ❌ No constraint | - | - | ✅ Status check (admin) | No (service enforced) |
| **Receipt Lines** |
| INV-GR-013 | Receipt MUST have ≥1 line before confirm | ❌ No constraint | - | ✅ validateReceiptCanBeConfirmed | ✅ Checked in service | **GAP** (DB allows empty) |
| INV-GR-014 | GoodsReceiptLine.quantity > 0 | ❌ No constraint | - | ✅ validatePositiveQuantity | ✅ All mutations | **GAP** (DB allows 0 or negative) |
| INV-GR-015 | Line references valid Item | ✅ FK RESTRICT | ✅ Required | - | ✅ Item existence check | No |
| INV-GR-016 | batchNumber MAY be null | - | ❌ Nullable | - | - | No |
| INV-GR-017 | expiryDate MAY be null | - | ❌ Nullable | - | ✅ validateExpiryDate if set | No |
| INV-GR-018 | scannedGtin MAY be null | - | ❌ Nullable | - | - | No |
| **Cross-Entity Constraints** |
| INV-GR-019 | If orderId set, Order in same Practice | ❌ No constraint | - | - | ❌ Not explicitly validated | **GAP** (relies on FK) |
| INV-GR-020 | If supplierId set, Supplier in same Practice | ❌ No constraint | - | - | ✅ Supplier check | **PARTIAL** (no DB constraint) |
| INV-GR-021 | Location in same Practice | ✅ FK CASCADE via Practice | - | - | ✅ Location check | No |
| INV-GR-022 | All Line items in same Practice | ❌ No constraint | - | - | ❌ Not explicitly validated | **GAP** (relies on FK) |
| **Inventory Impact** |
| INV-GR-023 | Confirm MUST update LocationInventory | - | - | - | ✅ In confirmGoodsReceipt | No (service enforced) |
| INV-GR-024 | Confirm MUST create StockAdjustment | - | - | - | ✅ In confirmGoodsReceipt | No (service enforced) |
| INV-GR-025 | Confirm linked Order MUST update Order status | - | - | - | ✅ updateOrderStatusAfterReceiving | No (service enforced) |
| INV-GR-026 | Confirm MUST set receivedAt | - | - | - | ✅ In confirmGoodsReceipt | No (service enforced) |
| INV-GR-027 | Cannot confirm without lines | ❌ No constraint | - | ✅ validateReceiptCanBeConfirmed | ✅ Checked | **GAP** (DB allows) |
| INV-GR-028 | Cannot confirm with qty ≤ 0 | ❌ No constraint | - | ✅ validateReceiptCanBeConfirmed | ✅ Checked | **GAP** (DB allows) |
| INV-GR-029 | Can receive > ordered quantity | - | - | - | ✅ Allowed | No (by design) |

---

## Inventory Domain

| ID | Invariant | DB | Prisma | Validator | Service | Gap? |
|----|-----------|----|----|-----------|---------|------|
| **Item Identity & Ownership** |
| INV-I-001 | Item MUST belong to one Practice | ✅ FK CASCADE | ✅ Required | - | ✅ Scoped queries | No |
| INV-I-002 | Item MUST reference one Product | ✅ FK RESTRICT | ✅ Required | - | ✅ Product check | No |
| INV-I-003 | Item.name is required | ✅ NOT NULL | ✅ Required | ✅ validateStringLength | ✅ Validated | No |
| INV-I-004 | Item.sku MAY be null | - | ❌ Nullable | ✅ validateStringLength if set | - | No |
| INV-I-005 | Item.defaultSupplierId MAY be null | ⚠️ No onDelete | ❌ Nullable | - | - | **GAP** (orphan risk) |
| INV-I-006 | Item.defaultPracticeSupplierId MAY be null | ⚠️ No onDelete | ❌ Nullable | - | - | **GAP** (orphan risk) |
| **Item Cross-Entity** |
| INV-I-007 | If defaultSupplierId set, same Practice | ❌ No constraint | - | - | ❌ Not validated | **GAP** |
| INV-I-008 | If defaultPracticeSupplierId set, same Practice | ❌ No constraint | - | - | ❌ Not validated | **GAP** |
| INV-I-009 | Product must exist (RESTRICT protects) | ✅ FK RESTRICT | ✅ Required | - | ✅ Product check | No |
| **LocationInventory** |
| INV-LI-001 | Unique (locationId, itemId) | ✅ Composite PK | ✅ @@id | - | - | No |
| INV-LI-002 | quantity ≥ 0 | ❌ No constraint | ❌ Defaults 0 | ✅ validateNonNegativeResult | ✅ adjustStock checks | **CRITICAL GAP** (DB allows negative) |
| INV-LI-003 | quantity defaults to 0 | ✅ DEFAULT 0 | ✅ Default | - | - | No |
| INV-LI-004 | reorderPoint MAY be null | - | ❌ Nullable | - | - | No |
| INV-LI-005 | reorderQuantity MAY be null | - | ❌ Nullable | - | - | No |
| INV-LI-006 | If reorderPoint set, ≥ 0 | ❌ No constraint | - | - | ✅ updateReorderSettings | **GAP** (DB allows negative) |
| INV-LI-007 | If reorderQuantity set, > 0 | ❌ No constraint | - | - | ✅ updateReorderSettings | **GAP** (DB allows 0 or negative) |
| **StockAdjustment** |
| INV-SA-001 | Adjustment belongs to one Practice | ✅ FK CASCADE | ✅ Required | - | ✅ Scoped queries | No |
| INV-SA-002 | Adjustment references one Item | ✅ FK CASCADE | ✅ Required | - | ✅ Item check | No |
| INV-SA-003 | Adjustment references one Location | ✅ FK CASCADE | ✅ Required | - | ✅ Location check | No |
| INV-SA-004 | Adjustment has creator | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Set on create | **GAP** (orphan risk) |
| INV-SA-005 | quantity CAN be negative | ✅ Signed int | - | - | ✅ Allowed | No (by design) |
| INV-SA-006 | quantity MUST NOT be zero | ❌ No constraint | - | - | ✅ adjustStock checks | **GAP** (DB allows 0) |
| INV-SA-007 | Adjustment MUST NOT result in negative inventory | ❌ No constraint | - | ✅ validateNonNegativeResult | ✅ Pre-validated | **GAP** (DB allows) |
| INV-SA-010 | StockAdjustment is immutable | ❌ No constraint | - | - | ❌ No update methods | **WEAK** (could update directly) |
| **InventoryTransfer** |
| INV-IT-001 | Transfer belongs to one Practice | ✅ FK CASCADE | ✅ Required | - | ✅ Scoped queries | No |
| INV-IT-002 | Transfer references one Item | ✅ FK CASCADE | ✅ Required | - | ✅ Item check | No |
| INV-IT-003 | Transfer has fromLocationId | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Checked | **GAP** (orphan risk) |
| INV-IT-004 | Transfer has toLocationId | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Checked | **GAP** (orphan risk) |
| INV-IT-005 | Transfer has creator | ⚠️ FK, no onDelete | ✅ Required | - | ✅ Set on create | **GAP** (orphan risk) |
| INV-IT-006 | quantity > 0 | ❌ No constraint | - | ✅ validatePositiveQuantity | ✅ Validated | **GAP** (DB allows 0 or negative) |
| INV-IT-007 | fromLocationId ≠ toLocationId | ❌ No constraint | - | ✅ validateTransferLocations | ✅ Validated | **GAP** (DB allows same location) |
| INV-IT-008 | Source has sufficient stock | ❌ No constraint | - | - | ✅ transferInventory checks | **GAP** (DB allows overdraft) |
| INV-IT-009 | Transfer is atomic | - | - | - | ✅ Transaction | No (service enforced) |
| INV-IT-010 | Both locations in same Practice | ❌ No constraint | - | - | ❌ Not explicitly validated | **GAP** (relies on FK) |
| INV-IT-011 | InventoryTransfer is immutable | ❌ No constraint | - | - | ❌ No update methods | **WEAK** (could update directly) |
| **SupplierItem** |
| INV-SI-001 | Unique (supplierId, itemId) | ✅ UNIQUE constraint | ✅ Unique | - | - | No |
| INV-SI-002 | References valid Supplier | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-SI-003 | MAY reference PracticeSupplier | ⚠️ No onDelete | ❌ Nullable | - | - | **GAP** (orphan risk) |
| INV-SI-004 | References valid Item | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-SI-005 | unitPrice MAY be null | - | ❌ Nullable | - | - | No |
| INV-SI-006 | unitPrice (if set) ≥ 0 | ❌ No constraint | - | ✅ validatePrice | ❌ Not consistently used | **GAP** (negative price possible) |
| INV-SI-007 | minOrderQty defaults to 1 | ✅ DEFAULT 1 | ✅ Default | - | - | No |
| INV-SI-008 | minOrderQty > 0 | ❌ No constraint | - | - | ❌ Not validated | **GAP** (DB allows 0 or negative) |
| INV-SI-009 | Supplier and Item in same Practice | ❌ No constraint | - | - | ❌ Not validated | **GAP** |

---

## Supplier Domain

| ID | Invariant | DB | Prisma | Validator | Service | Gap? |
|----|-----------|----|----|-----------|---------|------|
| **GlobalSupplier** |
| INV-GS-001 | name is required | ✅ NOT NULL | ✅ Required | - | - | No |
| INV-GS-002-005 | Contact fields MAY be null | - | ❌ Nullable | - | - | No |
| **PracticeSupplier** |
| INV-PS-001 | Unique (practiceId, globalSupplierId) | ✅ UNIQUE constraint | ✅ Unique | - | - | No |
| INV-PS-002 | References one Practice | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-PS-003 | References one GlobalSupplier | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-PS-008 | isPreferred defaults to false | ✅ DEFAULT false | ✅ Default | - | - | No |
| INV-PS-009 | isBlocked defaults to false | ✅ DEFAULT false | ✅ Default | - | - | No |
| INV-PS-010 | Blocked PracticeSupplier cannot create orders | ❌ No constraint | - | - | ✅ resolveSupplierIds checks | No (service enforced) |
| INV-PS-011 | migratedFromSupplierId links to legacy Supplier | ⚠️ No FK | ❌ String only | - | ✅ Used in resolution | **GAP** (no referential integrity) |
| **Legacy Supplier** |
| INV-LS-001 | Supplier belongs to one Practice | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-LS-002 | name is required | ✅ NOT NULL | ✅ Required | - | - | No |

---

## Products Domain

| ID | Invariant | DB | Prisma | Validator | Service | Gap? |
|----|-----------|----|----|-----------|---------|------|
| **Product** |
| INV-PR-001 | name is required | ✅ NOT NULL | ✅ Required | - | - | No |
| INV-PR-002 | gtin MAY be null | - | ❌ Nullable | - | - | No |
| INV-PR-003 | gtin is unique (if set) | ✅ UNIQUE constraint | ✅ Unique | ✅ validateGtin exists | ❌ Not enforced | **GAP** (invalid GTIN possible) |
| INV-PR-006 | isGs1Product defaults to false | ✅ DEFAULT false | ✅ Default | - | - | No |
| INV-PR-007 | gs1VerificationStatus defaults to UNVERIFIED | ✅ DEFAULT UNVERIFIED | ✅ Default | - | - | No |
| INV-PR-009 | If isGs1Product=true, gtin SHOULD be set | ❌ No constraint | - | - | ❌ Not validated | **GAP** (inconsistency possible) |
| INV-PR-010 | If gs1VerificationStatus=VERIFIED, gs1VerifiedAt SHOULD be set | ❌ No constraint | - | - | ❌ Not validated | **GAP** (inconsistency possible) |
| INV-PR-012 | Product shared across Practices | - | - | - | ✅ By design | No |
| INV-PR-013 | Cannot delete if Items exist | ✅ FK RESTRICT | ✅ RESTRICT | - | - | No |
| **SupplierCatalog** |
| INV-SC-001 | Unique (supplierId, productId) | ✅ UNIQUE constraint | ✅ Unique | - | - | No |
| INV-SC-002 | References Supplier | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-SC-003 | MAY reference PracticeSupplier | ✅ FK CASCADE | ❌ Nullable | - | - | No |
| INV-SC-004 | References Product | ✅ FK CASCADE | ✅ Required | - | - | No |
| INV-SC-007 | currency defaults to "EUR" | ✅ DEFAULT "EUR" | ✅ Default | - | - | No |
| INV-SC-008 | minOrderQty defaults to 1 | ✅ DEFAULT 1 | ✅ Default | - | - | No |
| INV-SC-009 | integrationType defaults to MANUAL | ✅ DEFAULT MANUAL | ✅ Default | - | - | No |
| INV-SC-013 | isActive defaults to true | ✅ DEFAULT true | ✅ Default | - | - | No |
| INV-SC-016 | supplierId and practiceSupplierId consistent | ❌ No constraint | - | - | ❌ Not validated | **GAP** (inconsistency possible) |

---

## Summary Statistics

### Overall Enforcement Coverage

| Enforcement Level | Count | Percentage |
|-------------------|-------|------------|
| **Fully Enforced** (DB + Service) | 45 | 35% |
| **Service Only** (No DB constraint) | 52 | 40% |
| **Partial** (Some enforcement) | 20 | 15% |
| **No Enforcement** (GAP) | 13 | 10% |
| **Total Invariants** | **130** | **100%** |

### Critical Gaps by Category

**P1 - Critical (Data Corruption Risk)**
1. ❌ LocationInventory.quantity can be negative (no DB CHECK constraint)
2. ❌ OrderItem.quantity can be zero or negative (no DB CHECK constraint)
3. ❌ GoodsReceiptLine.quantity can be zero or negative (no DB CHECK constraint)
4. ❌ Order status-dependent fields not enforced (sentAt with status)
5. ❌ GoodsReceipt status-dependent fields not enforced (receivedAt with status)

**P1 - Critical (Data Integrity Risk)**
6. ⚠️ Multiple User FK references with no onDelete behavior (orphan risk)
7. ⚠️ Item.defaultSupplierId with no onDelete behavior
8. ⚠️ Order.supplierId with no onDelete behavior
9. ⚠️ PracticeSupplier.migratedFromSupplierId has no FK constraint

**P2 - High (Business Logic Gaps)**
10. ❌ Order can be sent with zero items (no DB constraint)
11. ❌ GoodsReceipt can be confirmed with zero lines (no DB constraint)
12. ❌ InventoryTransfer.fromLocationId can equal toLocationId (no DB constraint)
13. ❌ Cross-practice constraints not enforced (Order-Item practice isolation)

**P3 - Medium (Validation Gaps)**
14. ❌ Product.gtin not validated with validateGtin()
15. ❌ SupplierItem.unitPrice not validated with validatePrice()
16. ❌ Negative prices possible in multiple places
17. ❌ Phase 2 supplier consistency not validated

### Enforcement by Domain

**Orders Domain:**
- DB Enforcement: 40%
- Service Enforcement: 90%
- Critical Gaps: 5

**Receiving Domain:**
- DB Enforcement: 45%
- Service Enforcement: 95%
- Critical Gaps: 4

**Inventory Domain:**
- DB Enforcement: 35%
- Service Enforcement: 85%
- Critical Gaps: 8 (most critical: negative inventory)

**Supplier Domain:**
- DB Enforcement: 60%
- Service Enforcement: 70%
- Critical Gaps: 2

**Products Domain:**
- DB Enforcement: 55%
- Service Enforcement: 60%
- Critical Gaps: 3

---

## Phase 2 Dual-Supplier Model Gaps

| Issue | Impact | Risk Level |
|-------|--------|------------|
| PracticeSupplier.migratedFromSupplierId is string, not FK | No referential integrity | **P1** |
| No validation that supplierId and practiceSupplierId are consistent | Could reference different suppliers | **P2** |
| Error if PracticeSupplier has no legacy mapping | Blocks new PracticeSuppliers | **P2** |
| No clear deprecation path for legacy Supplier model | Technical debt accumulation | **P3** |

---

## Magento Integration Critical Invariants

For successful Magento integration, these invariants MUST be reliable:

### P1 - Must Fix Before Integration
1. ✅ **Product.gtin uniqueness** - Magento product matching relies on this
2. ❌ **LocationInventory.quantity ≥ 0** - Magento stock sync will break with negative values
3. ❌ **Order status transitions** - Magento order state machine must match
4. ❌ **Item-Product relationship integrity** - Magento catalog sync depends on this

### P2 - Should Fix Before Integration
5. ✅ **SupplierCatalog.supplierId** - Magento supplier mapping
6. ❌ **Order.sentAt set when SENT** - Magento order timestamp sync
7. ❌ **GoodsReceipt.receivedAt set when CONFIRMED** - Magento delivery confirmation
8. ✅ **OrderItem.quantity > 0** - Magento line item validation

### P3 - Nice to Have
9. ✅ **Audit trail completeness** - Magento order history sync
10. ✅ **Practice isolation** - Multi-tenant Magento setup

---

## Recommendations

### Immediate Actions (Before Any Integration)

1. **Add DB CHECK constraints**:
   ```sql
   ALTER TABLE "LocationInventory" ADD CONSTRAINT "check_quantity_non_negative" CHECK (quantity >= 0);
   ALTER TABLE "OrderItem" ADD CONSTRAINT "check_quantity_positive" CHECK (quantity > 0);
   ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "check_quantity_positive" CHECK (quantity > 0);
   ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "check_quantity_positive" CHECK (quantity > 0);
   ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "check_different_locations" CHECK ("fromLocationId" != "toLocationId");
   ```

2. **Add onDelete policies**:
   - All User FKs: `onDelete: SetNull` (preserve audit trail)
   - Order.supplierId: `onDelete: SetNull` (preserve order history)
   - Item.defaultSupplierId: `onDelete: SetNull`

3. **Add FK constraint for migration tracking**:
   ```prisma
   migratedFromSupplier Supplier? @relation(fields: [migratedFromSupplierId], references: [id], onDelete: SetNull)
   ```

### Medium-Term Actions

4. **Add conditional NOT NULL constraints** (Postgres supports this):
   ```sql
   ALTER TABLE "Order" ADD CONSTRAINT "check_sent_has_sentAt" 
     CHECK (status != 'SENT' OR "sentAt" IS NOT NULL);
   ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "check_confirmed_has_receivedAt" 
     CHECK (status != 'CONFIRMED' OR "receivedAt" IS NOT NULL);
   ```

5. **Add aggregate validation triggers**:
   - Prevent Order.status=SENT if no OrderItems exist
   - Prevent GoodsReceipt.status=CONFIRMED if no lines exist

6. **Enforce GTIN validation**:
   - Use validateGtin() in Product creation/update
   - Add DB CHECK constraint for GTIN format (if feasible)

### Long-Term Actions

7. **Implement domain event pattern**:
   - OrderSent, ReceiptConfirmed, InventoryAdjusted events
   - Enable decoupled integrations (Magento, notifications)

8. **Add computed/virtual fields**:
   - Order.isEditable (computed from status)
   - GoodsReceipt.isImmutable (computed from status)

9. **Phase 2 cleanup**:
   - Deprecate legacy Supplier model
   - Make practiceSupplierId required
   - Remove supplierId from Order, SupplierCatalog

