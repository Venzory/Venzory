# Prisma Schema Constraint Analysis

## Overview
This document analyzes all constraints defined in `prisma/schema.prisma` including foreign keys, unique constraints, required fields, enums, defaults, and indexes.

---

## Foreign Key Relationships & Cascade Behaviors

### Practice Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Practice | PracticeUser | practiceId | CASCADE | User-practice membership deleted when practice deleted |
| User | PracticeUser | userId | CASCADE | Membership deleted when user deleted |
| Practice | Location | practiceId | CASCADE | All practice locations deleted with practice |
| Location | Location | parentId (self-ref) | - | Parent location for hierarchy |
| Practice | Item | practiceId | CASCADE | All practice items deleted with practice |
| Practice | Supplier | practiceId | CASCADE | All practice suppliers deleted with practice |
| Practice | Order | practiceId | CASCADE | All practice orders deleted with practice |
| Practice | GoodsReceipt | practiceId | CASCADE | All practice receipts deleted with practice |
| Practice | StockCountSession | practiceId | CASCADE | All stock counts deleted with practice |
| Practice | PracticeSupplier | practiceId | CASCADE | Practice-specific supplier links deleted |

### Product & Catalog Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Product | Item | productId | RESTRICT | **CRITICAL**: Cannot delete Product if Items exist |
| Product | SupplierCatalog | productId | CASCADE | Catalog entries deleted with product |
| GlobalSupplier | PracticeSupplier | globalSupplierId | CASCADE | Practice links deleted when global supplier deleted |
| Supplier (legacy) | SupplierCatalog | supplierId | CASCADE | Catalog entries deleted with supplier |
| PracticeSupplier | SupplierCatalog | practiceSupplierId | CASCADE | Phase 2 catalog entries deleted |

### Item & Inventory Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Supplier | Item | defaultSupplierId | - | **GAP**: No onDelete specified, implicit NULL? |
| PracticeSupplier | Item | defaultPracticeSupplierId | - | **GAP**: No onDelete specified |
| Item | LocationInventory | itemId | CASCADE | Inventory records deleted with item |
| Location | LocationInventory | locationId | CASCADE | Inventory deleted when location deleted |
| Item | SupplierItem | itemId | CASCADE | Supplier pricing deleted with item |
| Supplier | SupplierItem | supplierId | CASCADE | Pricing deleted with supplier |
| PracticeSupplier | SupplierItem | practiceSupplierId | - | **GAP**: No onDelete specified |

### Order Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Supplier | Order | supplierId | - | **GAP**: No onDelete specified |
| PracticeSupplier | Order | practiceSupplierId | - | **GAP**: No onDelete specified |
| User | Order | createdById | - | **GAP**: No onDelete specified |
| Order | OrderItem | orderId | CASCADE | Order items deleted with order |
| Item | OrderItem | itemId | - | **GAP**: No onDelete specified, should be RESTRICT? |

### Receiving Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Location | GoodsReceipt | locationId | RESTRICT | **GOOD**: Cannot delete location with active receipts |
| Order | GoodsReceipt | orderId | SetNull | Receipt preserved but order link removed |
| Supplier | GoodsReceipt | supplierId | SetNull | Receipt preserved but supplier link removed |
| User | GoodsReceipt | createdById | - | **GAP**: No onDelete specified |
| GoodsReceipt | GoodsReceiptLine | receiptId | CASCADE | Lines deleted with receipt |
| Item | GoodsReceiptLine | itemId | RESTRICT | **GOOD**: Cannot delete item with receipt history |

### Stock Management Domain
| Parent Model | Child Model | FK Field | onDelete Behavior | Notes |
|-------------|-------------|----------|------------------|-------|
| Item | StockAdjustment | itemId | CASCADE | Audit trail deleted with item |
| Location | StockAdjustment | locationId | CASCADE | Adjustments deleted with location |
| User | StockAdjustment | createdById | - | **GAP**: No onDelete specified |
| Item | InventoryTransfer | itemId | CASCADE | Transfers deleted with item |
| Location | InventoryTransfer | fromLocationId | - | **GAP**: No onDelete specified |
| Location | InventoryTransfer | toLocationId | - | **GAP**: No onDelete specified |
| User | InventoryTransfer | createdById | - | **GAP**: No onDelete specified |
| StockCountSession | StockCountLine | sessionId | CASCADE | Count lines deleted with session |
| Item | StockCountLine | itemId | RESTRICT | **GOOD**: Cannot delete item with count history |
| Location | StockCountSession | locationId | RESTRICT | **GOOD**: Cannot delete location with active counts |
| User | StockCountSession | createdById | - | **GAP**: No onDelete specified |

---

## Unique Constraints

### Single-Column Unique
| Model | Field | Purpose | Notes |
|-------|-------|---------|-------|
| User | email | Prevent duplicate users | **ENFORCED** |
| Practice | slug | URL-friendly identifier | **ENFORCED** |
| Product | gtin | Global Trade Item Number uniqueness | **ENFORCED**, nullable |
| VerificationToken | token | Auth token uniqueness | **ENFORCED** |
| PasswordResetToken | token | Reset token uniqueness | **ENFORCED** |
| UserInvite | token | Invite token uniqueness | **ENFORCED** |
| Session | sessionToken | Session uniqueness | **ENFORCED** |

### Multi-Column Unique (@@unique)
| Model | Fields | Purpose | Notes |
|-------|--------|---------|-------|
| PracticeUser | [practiceId, userId] | User can belong to practice only once | **ENFORCED** |
| LocationInventory | [locationId, itemId] | Composite primary key | **ENFORCED** (@@id) |
| SupplierItem | [supplierId, itemId] | One price per supplier-item pair | **ENFORCED** |
| OrderItem | [orderId, itemId] | One entry per item in order | **ENFORCED** |
| SupplierCatalog | [supplierId, productId] | One catalog entry per supplier-product | **ENFORCED** |
| PracticeSupplier | [practiceId, globalSupplierId] | Practice links to global supplier once | **ENFORCED** |
| OrderTemplateItem | [templateId, itemId] | One entry per item in template | **ENFORCED** |
| VerificationToken | [identifier, token] | Auth verification | **ENFORCED** |
| Account | [provider, providerAccountId] | OAuth account uniqueness | **ENFORCED** |

---

## Required Fields (NOT NULL)

### Practice & Users
- **Practice**: name, slug (all others nullable)
- **User**: email (name, image, passwordHash nullable)
- **PracticeUser**: practiceId, userId, role, status, invitedAt
- **Location**: practiceId, name (code, description, parentId nullable)

### Products & Items
- **Product**: name (gtin, brand, description nullable)
- **Item**: practiceId, productId, name (sku, description, unit, defaultSupplierId nullable)
- **GlobalSupplier**: name (all others nullable)
- **Supplier**: practiceId, name (all others nullable)
- **PracticeSupplier**: practiceId, globalSupplierId (accountNumber, customLabel nullable)

### Orders
- **Order**: practiceId, supplierId, status, createdById (reference, notes, sentAt, expectedAt, receivedAt nullable)
  - **GAP**: supplierId is required but practiceSupplierId is nullable (Phase 2 dual-model)
- **OrderItem**: orderId, itemId, quantity (unitPrice, notes nullable)
  - **GAP**: No NOT NULL on quantity, but should always be positive

### Receiving
- **GoodsReceipt**: practiceId, locationId, status, createdById (orderId, supplierId, notes, receivedAt nullable)
- **GoodsReceiptLine**: receiptId, itemId, quantity (batchNumber, expiryDate, notes, scannedGtin nullable)
  - **GAP**: No NOT NULL on quantity, but should always be positive

### Inventory
- **LocationInventory**: locationId, itemId, quantity (reorderPoint, reorderQuantity nullable)
  - **GAP**: quantity has default 0 but no explicit NOT NULL
- **StockAdjustment**: itemId, locationId, practiceId, quantity, createdById (reason, note nullable)
  - **GAP**: quantity can be negative (for adjustments) but no explicit constraint
- **InventoryTransfer**: practiceId, itemId, fromLocationId, toLocationId, quantity, createdById (note nullable)

---

## Enums & Valid States

### PracticeRole
- **Values**: ADMIN, STAFF, VIEWER
- **Used in**: PracticeUser.role, UserInvite.role
- **Default**: STAFF

### MembershipStatus
- **Values**: INVITED, ACTIVE, SUSPENDED
- **Used in**: PracticeUser.status
- **Default**: INVITED

### OrderStatus
- **Values**: DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
- **Used in**: Order.status
- **Default**: DRAFT
- **Valid Transitions**: 
  - DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED
  - DRAFT → CANCELLED
  - SENT → CANCELLED (questionable, should be validated in service)

### GoodsReceiptStatus
- **Values**: DRAFT, CONFIRMED, CANCELLED
- **Used in**: GoodsReceipt.status
- **Default**: DRAFT
- **Valid Transitions**:
  - DRAFT → CONFIRMED
  - DRAFT → CANCELLED

### StockCountStatus
- **Values**: IN_PROGRESS, COMPLETED, CANCELLED
- **Used in**: StockCountSession.status
- **Default**: IN_PROGRESS
- **Valid Transitions**:
  - IN_PROGRESS → COMPLETED
  - IN_PROGRESS → CANCELLED

### Gs1VerificationStatus
- **Values**: UNVERIFIED, PENDING, VERIFIED, FAILED, EXPIRED
- **Used in**: Product.gs1VerificationStatus
- **Default**: UNVERIFIED

### IntegrationType
- **Values**: MANUAL, API, EDI, OCI, CSV
- **Used in**: SupplierCatalog.integrationType
- **Default**: MANUAL

---

## Default Values

| Model | Field | Default | Notes |
|-------|-------|---------|-------|
| All models | id | cuid() | Unique identifier |
| All models | createdAt | now() | Timestamp |
| All models | updatedAt | updatedAt | Auto-updated |
| PracticeUser | role | STAFF | User role in practice |
| PracticeUser | status | INVITED | Membership status |
| Order | status | DRAFT | Order starts as draft |
| GoodsReceipt | status | DRAFT | Receipt starts as draft |
| StockCountSession | status | IN_PROGRESS | Count session starts in progress |
| Product | isGs1Product | false | Assume non-GS1 by default |
| Product | gs1VerificationStatus | UNVERIFIED | Not verified by default |
| LocationInventory | quantity | 0 | Start with zero stock |
| SupplierItem | minOrderQty | 1 | Default minimum order |
| SupplierItem | currency | "EUR" | Default currency |
| SupplierCatalog | minOrderQty | 1 | Default minimum order |
| SupplierCatalog | currency | "EUR" | Default currency |
| SupplierCatalog | integrationType | MANUAL | Default integration type |
| SupplierCatalog | isActive | true | Active by default |
| PracticeSupplier | isPreferred | false | Not preferred by default |
| PracticeSupplier | isBlocked | false | Not blocked by default |
| Notification | status | "PENDING" | Notification pending |
| InAppNotification | read | false | Not read by default |
| PasswordResetToken | used | false | Token not used |
| UserInvite | used | false | Invite not used |

---

## Indexes

### Single-Column Indexes
| Model | Field | Purpose |
|-------|-------|---------|
| PracticeUser | userId | Fast lookup by user |
| Location | practiceId | Fast lookup by practice |
| Product | gtin | Fast GTIN lookup |
| Product | isGs1Product | Filter GS1 products |
| GlobalSupplier | name | Fast supplier search |
| Item | practiceId | Fast lookup by practice |
| Item | productId | Fast lookup by product |
| Item | defaultSupplierId | Fast lookup by supplier |
| Item | defaultPracticeSupplierId | Fast lookup by practice supplier |
| SupplierItem | itemId | Fast lookup by item |
| SupplierItem | practiceSupplierId | Fast lookup by practice supplier |
| Order | practiceId | Fast lookup by practice |
| Order | supplierId | Fast lookup by supplier |
| Order | practiceSupplierId | Fast lookup by practice supplier |
| OrderTemplateItem | templateId | Fast lookup by template |
| OrderTemplateItem | itemId | Fast lookup by item |
| StockAdjustment | practiceId | Fast lookup by practice |
| StockAdjustment | itemId | Fast lookup by item |
| StockAdjustment | locationId | Fast lookup by location |
| InventoryTransfer | practiceId | Fast lookup by practice |
| InventoryTransfer | itemId | Fast lookup by item |
| InventoryTransfer | fromLocationId | Fast lookup by source |
| InventoryTransfer | toLocationId | Fast lookup by destination |
| GoodsReceipt | practiceId | Fast lookup by practice |
| GoodsReceipt | locationId | Fast lookup by location |
| GoodsReceipt | orderId | Fast lookup by order |
| GoodsReceipt | supplierId | Fast lookup by supplier |
| GoodsReceipt | status | Fast filter by status |
| GoodsReceipt | createdAt | Fast sort by date |
| GoodsReceiptLine | receiptId | Fast lookup by receipt |
| GoodsReceiptLine | itemId | Fast lookup by item |
| StockCountSession | practiceId | Fast lookup by practice |
| StockCountSession | locationId | Fast lookup by location |
| StockCountSession | status | Fast filter by status |
| StockCountSession | createdAt | Fast sort by date |
| StockCountLine | sessionId | Fast lookup by session |
| StockCountLine | itemId | Fast lookup by item |
| AuditLog | practiceId | Fast lookup by practice |
| Notification | practiceId | Fast lookup by practice |
| Notification | recipientId | Fast lookup by recipient |
| InAppNotification | practiceId | Fast lookup by practice |
| InAppNotification | userId | Fast lookup by user |
| InAppNotification | read | Fast filter unread |
| PasswordResetToken | userId | Fast lookup by user |
| PasswordResetToken | token | Fast lookup by token |
| UserInvite | token | Fast lookup by token |
| UserInvite | practiceId | Fast lookup by practice |
| PracticeSupplier | practiceId | Fast lookup by practice |
| PracticeSupplier | globalSupplierId | Fast lookup by global supplier |
| PracticeSupplier | migratedFromSupplierId | Fast migration lookup |
| SupplierCatalog | supplierId | Fast lookup by supplier |
| SupplierCatalog | practiceSupplierId | Fast lookup by practice supplier |
| SupplierCatalog | productId | Fast lookup by product |
| SupplierCatalog | isActive | Fast filter active entries |

### Composite Indexes
| Model | Fields | Purpose |
|-------|--------|---------|
| Item | [practiceId, name] | Fast search by name within practice |
| Item | [practiceId, sku] | Fast search by SKU within practice |
| Order | [practiceId, status, createdAt] | Optimized order list queries |
| AuditLog | [entityType, entityId] | Fast audit trail lookup |

---

## Missing Database Constraints (Potential Gaps)

### Status-Dependent Fields
- **GAP**: No DB constraint ensuring Order.sentAt is NULL when status=DRAFT
- **GAP**: No DB constraint ensuring Order.sentAt is NOT NULL when status=SENT
- **GAP**: No DB constraint ensuring GoodsReceipt.receivedAt is NOT NULL when status=CONFIRMED
- **GAP**: No DB constraint ensuring StockCountSession.completedAt is NOT NULL when status=COMPLETED

### Cross-Entity Constraints
- **GAP**: No DB constraint ensuring GoodsReceipt.practiceId = Order.practiceId when orderId is set
- **GAP**: No DB constraint ensuring OrderItem.quantity > 0
- **GAP**: No DB constraint ensuring GoodsReceiptLine.quantity > 0
- **GAP**: No DB constraint ensuring LocationInventory.quantity >= 0
- **GAP**: No DB constraint ensuring InventoryTransfer.fromLocationId != toLocationId

### Referential Integrity Gaps
- **GAP**: Item.defaultSupplierId has no onDelete behavior specified
- **GAP**: Order.supplierId has no onDelete behavior specified
- **GAP**: Order.createdById has no onDelete behavior specified
- **GAP**: GoodsReceipt.createdById has no onDelete behavior specified
- **GAP**: Multiple User FK references have no onDelete behavior

### Business Rule Constraints
- **GAP**: No DB constraint preventing Order status transitions (e.g., RECEIVED → DRAFT)
- **GAP**: No DB constraint preventing editing SENT orders
- **GAP**: No DB constraint preventing editing CONFIRMED receipts
- **GAP**: No DB constraint ensuring Order has at least one OrderItem before status=SENT

---

## Cascade Behavior Risk Assessment

### High Risk (Data Loss)
- **Practice CASCADE**: Deleting a Practice deletes ALL related data (orders, items, inventory, etc.)
  - **Risk**: Accidental practice deletion = complete data loss
  - **Mitigation**: Soft delete pattern or admin-only hard delete

### Medium Risk (Audit Trail Loss)
- **Item CASCADE on StockAdjustment**: Deleting an item removes adjustment history
  - **Risk**: Loss of audit trail
  - **Recommendation**: Consider RESTRICT or soft delete

### Low Risk (Expected Behavior)
- **Order CASCADE on OrderItem**: Expected behavior
- **GoodsReceipt CASCADE on GoodsReceiptLine**: Expected behavior

### Well Protected
- **Product RESTRICT on Item**: Cannot delete product if items exist ✓
- **Item RESTRICT on GoodsReceiptLine**: Cannot delete item with receipt history ✓
- **Location RESTRICT on GoodsReceipt**: Cannot delete location with receipts ✓

---

## Summary of Key Findings

### Strengths
1. ✅ Good use of CASCADE for owned entities (OrderItem, GoodsReceiptLine)
2. ✅ RESTRICT protection on critical entities (Product, Item in receipts)
3. ✅ Comprehensive unique constraints prevent duplicates
4. ✅ Proper indexing for common query patterns
5. ✅ Enum types enforce valid state values

### Critical Gaps
1. ❌ Missing onDelete behaviors on many User FK references (orphan risk)
2. ❌ Missing onDelete behaviors on Order.supplierId and Item.defaultSupplierId
3. ❌ No DB-level enforcement of positive quantities
4. ❌ No DB-level enforcement of status-dependent fields (sentAt, receivedAt, etc.)
5. ❌ No DB-level enforcement of cross-entity constraints (practice isolation)

### Recommendations
1. **Add CHECK constraints** for positive quantities on OrderItem, GoodsReceiptLine, InventoryTransfer
2. **Add onDelete policies** for all User FK references (likely SetNull or Restrict)
3. **Add onDelete policies** for supplier references (SetNull to preserve history)
4. **Consider CHECK constraints** for status-dependent fields (Postgres supports this)
5. **Implement soft delete** pattern for Practice and other high-risk CASCADE deletes
6. **Add service-level validation** for constraints that can't be expressed in DB (status transitions)

