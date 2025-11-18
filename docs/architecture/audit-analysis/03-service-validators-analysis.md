# Service Layer & Validator Analysis

## Overview
Analysis of validation enforcement in the service layer (`src/services/`) and domain validators (`src/domain/validators/`).

---

## Domain Validators (`src/domain/validators/index.ts`)

### Implemented Validators

#### 1. **validateGtin(gtin: string): boolean**
- **Purpose**: Validates GTIN format and check digit
- **Supports**: GTIN-8, GTIN-12, GTIN-13, GTIN-14
- **Algorithm**: GS1 check digit validation
- **Returns**: boolean (true if valid)
- **Usage**: Product creation/update
- **Enforcement Level**: Application-level only

#### 2. **validateEmail(email: string): boolean**
- **Purpose**: Validates email format
- **Pattern**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Returns**: boolean
- **Usage**: User/Supplier email validation
- **Enforcement Level**: Application-level only

#### 3. **validatePositiveQuantity(quantity: number): void**
- **Purpose**: Ensures quantity is positive integer
- **Checks**:
  - Must be whole number (integer)
  - Must be greater than zero
- **Throws**: `ValidationError` if invalid
- **Usage**: OrderItem, GoodsReceiptLine, InventoryTransfer, OrderTemplateItem
- **Enforcement Level**: Service layer (throws exception)
- **Gap**: No DB-level CHECK constraint

#### 4. **validateNonNegativeResult(current: number, adjustment: number): void**
- **Purpose**: Ensures stock adjustment doesn't result in negative inventory
- **Checks**: `current + adjustment >= 0`
- **Throws**: `ValidationError` with descriptive message
- **Usage**: StockAdjustment before applying
- **Enforcement Level**: Service layer (throws exception)
- **Gap**: No DB-level CHECK constraint on final quantity

#### 5. **validatePrice(price: number): void**
- **Purpose**: Ensures price is non-negative
- **Checks**: `price >= 0`
- **Throws**: `ValidationError`
- **Usage**: Supplier catalog, supplier items
- **Enforcement Level**: Service layer
- **Note**: Price can be zero (free items)

#### 6. **validateStringLength(value: string, fieldName: string, min: number, max?: number): void**
- **Purpose**: Validates string length constraints
- **Parameters**:
  - `value`: String to validate
  - `fieldName`: For error message
  - `min`: Minimum length (default 1)
  - `max`: Optional maximum length
- **Throws**: `ValidationError` with field name
- **Usage**: Item names, SKUs, descriptions
- **Enforcement Level**: Service layer

#### 7. **validateSku(sku: string): boolean**
- **Purpose**: Validates SKU format
- **Pattern**: `/^[a-zA-Z0-9_-]+$/` (alphanumeric with hyphens/underscores)
- **Returns**: boolean
- **Usage**: Item SKU validation
- **Enforcement Level**: Application-level only
- **Note**: Not consistently used across codebase

#### 8. **validateUrl(url: string): boolean**
- **Purpose**: Validates URL format
- **Method**: Uses JavaScript `URL` constructor
- **Returns**: boolean
- **Usage**: Supplier website validation
- **Enforcement Level**: Application-level only

#### 9. **validateFutureDate(date: Date, fieldName: string): void**
- **Purpose**: Ensures date is not in the past
- **Checks**: `date >= now`
- **Throws**: `ValidationError`
- **Usage**: Expected delivery dates
- **Enforcement Level**: Service layer
- **Note**: Not consistently used

#### 10. **validateExpiryDate(expiryDate: Date): void**
- **Purpose**: Ensures expiry date is reasonable
- **Checks**:
  - Not more than 1 year in the past
  - Not more than 10 years in the future
- **Throws**: `ValidationError`
- **Usage**: GoodsReceiptLine expiry dates
- **Enforcement Level**: Service layer

#### 11. **validateOrderCanBeSent(order: { status, items, supplierId }): void**
- **Purpose**: Validates order is ready to be sent
- **Checks**:
  - Status must be DRAFT
  - Must have supplier
  - Must have at least one item
  - All items must have positive quantities
- **Throws**: `ValidationError`
- **Usage**: OrderService.sendOrder()
- **Enforcement Level**: Service layer
- **Critical**: Prevents sending incomplete orders

#### 12. **validateReceiptCanBeConfirmed(receipt: { status, lines }): void**
- **Purpose**: Validates receipt is ready to be confirmed
- **Checks**:
  - Status must be DRAFT
  - Must have at least one line
  - All lines must have positive quantities
- **Throws**: `ValidationError`
- **Usage**: ReceivingService.confirmGoodsReceipt()
- **Enforcement Level**: Service layer
- **Critical**: Prevents confirming incomplete receipts

#### 13. **validateTransferLocations(fromLocationId: string, toLocationId: string): void**
- **Purpose**: Ensures transfer locations are different
- **Checks**: `fromLocationId !== toLocationId`
- **Throws**: `ValidationError`
- **Usage**: InventoryService.transferInventory()
- **Enforcement Level**: Service layer

---

## Service Layer Enforcement Patterns

### OrderService (`src/services/orders/order-service.ts`)

#### Validation Points

**1. createOrder()**
- ✅ Validates: `requireRole(ctx, 'STAFF')` - Authorization
- ✅ Validates: At least one item
- ✅ Validates: Either supplierId OR practiceSupplierId provided
- ✅ Validates: `validatePositiveQuantity()` for each item
- ✅ Validates: All items exist in database
- ✅ Validates: Supplier resolution (dual-model support)
- ✅ Validates: PracticeSupplier not blocked (Phase 2)
- ✅ Uses transaction for atomicity
- ❌ **GAP**: No validation that items belong to same practice as order
- ❌ **GAP**: No validation that supplier belongs to same practice

**2. updateOrder()**
- ✅ Validates: `requireRole(ctx, 'STAFF')` - Authorization
- ✅ Validates: Order exists
- ✅ Validates: Order status is DRAFT
- ✅ Throws: `BusinessRuleViolationError` if order is not DRAFT
- ✅ Uses transaction

**3. addOrderItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validatePositiveQuantity()`
- ✅ Validates: Order exists and is DRAFT
- ✅ Validates: Item exists
- ✅ Validates: Item not already in order
- ✅ Throws: `ValidationError` if item already exists
- ✅ Uses transaction

**4. updateOrderItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validatePositiveQuantity()`
- ✅ Validates: Order exists and is DRAFT
- ✅ Uses transaction

**5. removeOrderItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Order exists and is DRAFT
- ✅ Uses transaction
- ❌ **GAP**: No validation preventing removal of last item (could leave order empty)

**6. sendOrder()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validateOrderCanBeSent()` - comprehensive check
- ✅ Sets: `sentAt` timestamp
- ✅ Updates: Status to SENT
- ✅ Creates: Audit log entry
- ✅ Uses transaction
- **CRITICAL**: This is the gate that prevents incomplete orders from being sent

**7. deleteOrder()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Order exists and is DRAFT
- ✅ Throws: `BusinessRuleViolationError` if not DRAFT
- ✅ Uses transaction

**8. createOrdersFromLowStock()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Items selected
- ✅ Skips: Items without default supplier
- ✅ Groups: Items by supplier
- ✅ Uses transaction
- ❌ **GAP**: No validation of low stock criteria

**9. createOrdersFromTemplate()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Template exists and belongs to practice
- ✅ Validates: At least one order to create
- ✅ Validates: Suppliers belong to practice
- ✅ Uses transaction

#### Authorization Pattern
- Consistent use of `requireRole(ctx, 'STAFF')` or `requireRole(ctx, 'ADMIN')`
- Context contains practiceId and userId
- All queries scoped to practiceId (practice isolation)

#### Transaction Pattern
- All write operations use `withTransaction()`
- Ensures atomicity of multi-step operations
- Rollback on any error

#### Supplier Resolution (Phase 2 Dual-Model)
- **resolveSupplierIds()** method handles complexity
- Case 1: PracticeSupplier provided (preferred)
  - Validates PracticeSupplier exists
  - Checks if blocked
  - Derives legacy supplierId from migration tracking
- Case 2: Legacy Supplier provided (backward compatibility)
  - Validates Supplier exists
  - Attempts to find corresponding PracticeSupplier
- **GAP**: Throws error if PracticeSupplier has no legacy mapping

---

### ReceivingService (`src/services/receiving/receiving-service.ts`)

#### Validation Points

**1. createGoodsReceipt()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Location exists
- ✅ Validates: Supplier exists (if provided)
- ✅ Uses transaction
- ❌ **GAP**: No validation that location and supplier belong to same practice
- ❌ **GAP**: If orderId provided, no validation here (done at UI level?)

**2. addReceiptLine()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validatePositiveQuantity()`
- ✅ Validates: `validateExpiryDate()` if expiry provided
- ✅ Validates: Receipt exists and is DRAFT
- ✅ Validates: Item exists
- ✅ Upserts: Line (increments if item already exists)
- ✅ Uses transaction

**3. updateReceiptLine()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validatePositiveQuantity()` if quantity updated
- ✅ Validates: `validateExpiryDate()` if expiry updated
- ✅ Validates: Receipt exists and is DRAFT
- ✅ Validates: Practice access check
- ✅ Uses transaction

**4. removeReceiptLine()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Receipt exists and is DRAFT
- ✅ Validates: Practice access check
- ✅ Uses transaction
- ❌ **GAP**: No validation preventing removal of last line (could leave receipt empty)

**5. confirmGoodsReceipt()** - **CRITICAL**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validateReceiptCanBeConfirmed()` - comprehensive check
- ✅ Process: For each line:
  - Gets current inventory
  - Calculates new quantity
  - Updates LocationInventory (upsert)
  - Creates StockAdjustment record (audit trail)
  - Checks for low stock notification
- ✅ Updates: Receipt status to CONFIRMED
- ✅ Sets: `receivedAt` timestamp
- ✅ Updates: Order status if linked (PARTIALLY_RECEIVED or RECEIVED)
- ✅ Creates: Audit log entry with all details
- ✅ Uses transaction
- **CRITICAL**: This is the gate that updates inventory
- **GOOD**: Atomic - all-or-nothing
- **GOOD**: Creates audit trail via StockAdjustment

**6. cancelGoodsReceipt()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Receipt exists and is DRAFT
- ✅ Throws: `BusinessRuleViolationError` if not DRAFT
- ✅ Uses transaction

**7. deleteGoodsReceipt()**
- ✅ Validates: `requireRole(ctx, 'ADMIN')` - Admin only
- ✅ Validates: Receipt exists and is NOT CONFIRMED
- ✅ Throws: `BusinessRuleViolationError` if CONFIRMED
- ✅ Uses transaction

**8. updateOrderStatusAfterReceiving()** - **CRITICAL**
- ⚠️ Private method called within confirmGoodsReceipt transaction
- ✅ Gets order with all items
- ✅ Gets all CONFIRMED receipts for order
- ✅ Calculates: Total received quantities per item
- ✅ Determines: All items fully received? Any items received?
- ✅ Updates: Order status to PARTIALLY_RECEIVED or RECEIVED
- ✅ Sets: `receivedAt` timestamp
- **CRITICAL**: Logic for order completion tracking
- **GOOD**: Considers all receipts, not just current one
- **GOOD**: Handles partial deliveries correctly

**9. searchItemByGtin()**
- ✅ Searches items by Product GTIN
- ✅ Returns: itemId and itemName
- ❌ **GAP**: No practice scoping (searches all items?)
  - Actually it is practice-scoped via `ctx.practiceId`

---

### InventoryService (`src/services/inventory/inventory-service.ts`)

#### Validation Points

**1. createItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validateStringLength(name, 'Item name', 1, 255)`
- ✅ Validates: `validateStringLength(sku, 'SKU', 1, 64)` if provided
- ✅ Validates: Product exists
- ✅ Creates: Audit log entry
- ✅ Uses transaction
- ❌ **GAP**: No validation that product is accessible to practice

**2. addItemFromCatalog()** - **Phase 2**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: String lengths
- ✅ Validates: Product exists
- ✅ Validates: Product available from PracticeSupplier (checks SupplierCatalog)
- ✅ Validates: Item doesn't already exist for this product
- ✅ Throws: `BusinessRuleViolationError` if already exists
- ✅ Creates: Audit log entry
- ✅ Uses transaction
- **GOOD**: Prevents duplicate items for same product

**3. updateItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: String lengths if updated
- ✅ Validates: Item exists
- ✅ Creates: Audit log entry
- ✅ Uses transaction

**4. deleteItem()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Item exists
- ✅ Creates: Audit log entry
- ✅ Uses transaction
- ⚠️ Relies on: DB RESTRICT constraints to prevent deletion if:
  - Item has receipt history (GoodsReceiptLine FK)
  - Item has stock count history (StockCountLine FK)

**5. adjustStock()** - **CRITICAL**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Adjustment quantity cannot be zero
- ✅ Validates: Item exists
- ✅ Validates: Location exists
- ✅ Gets: Current inventory quantity
- ✅ Validates: `validateNonNegativeResult()` - prevents negative stock
- ✅ Performs: Atomic inventory adjustment
- ✅ Creates: StockAdjustment record (audit trail)
- ✅ Creates: Audit log entry
- ✅ Uses transaction
- **CRITICAL**: This is the gate that prevents negative inventory
- **GOOD**: validateNonNegativeResult throws before any changes

**6. transferInventory()** - **CRITICAL**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: `validatePositiveQuantity()`
- ✅ Validates: `validateTransferLocations()` - from != to
- ✅ Validates: Item exists
- ✅ Gets: Source inventory
- ✅ Validates: Sufficient stock at source
- ✅ Throws: `BusinessRuleViolationError` if insufficient
- ✅ Performs: Atomic deduct from source, add to destination
- ✅ Creates: InventoryTransfer record (audit trail)
- ✅ Uses transaction
- **CRITICAL**: Atomic transfer prevents partial failures
- **GOOD**: Validates before any changes

**7. updateReorderSettings()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: reorderPoint >= 0 if set
- ✅ Validates: reorderQuantity > 0 if set
- ✅ Validates: Item exists
- ❌ No transaction (single upsert operation)

**8. completeStockCount()** - **CRITICAL**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Session exists and is IN_PROGRESS
- ✅ Validates: Session has at least one line
- ✅ Throws: `ValidationError` if empty
- ✅ Process: If applyAdjustments=true, for each line with variance:
  - Gets existing inventory (for reorder settings)
  - Updates LocationInventory to counted quantity
  - Creates StockAdjustment (audit trail)
  - Checks for low stock notification
- ✅ Updates: Session status to COMPLETED
- ✅ Creates: Audit log entry with summary
- ✅ Uses transaction
- **CRITICAL**: Stock count adjustments are atomic
- **GOOD**: applyAdjustments flag allows review before applying

**9. cancelStockCount()**
- ✅ Validates: `requireRole(ctx, 'STAFF')`
- ✅ Validates: Session exists and is IN_PROGRESS
- ✅ Uses transaction

**10. deleteStockCountSession()**
- ✅ Validates: `requireRole(ctx, 'ADMIN')` - Admin only
- ✅ Validates: Session exists and is NOT COMPLETED
- ✅ Throws: `BusinessRuleViolationError` if COMPLETED
- ✅ Uses transaction

---

## Error Handling Patterns

### Custom Exceptions
1. **ValidationError**: Business rule violations (user input errors)
   - Used for: Invalid quantities, missing required fields, format errors
   - Should be: Displayed to user as actionable error
   
2. **BusinessRuleViolationError**: State-based violations (process errors)
   - Used for: Status checks, insufficient stock, immutable record edits
   - Should be: Displayed to user explaining why action not allowed
   
3. **NotFoundError**: Entity not found or no access
   - Used for: Missing records, practice isolation violations
   - Should be: 404 response or access denied

### Exception Usage Analysis
- ✅ Consistent use of appropriate exception types
- ✅ Descriptive error messages
- ✅ Thrown before any state changes (validate-first pattern)
- ✅ Transactions rollback on exception

---

## Authorization Pattern Analysis

### Context-Based Authorization
```typescript
// Typical pattern in all services
requireRole(ctx, 'STAFF') // or 'ADMIN'
```

- `ctx` contains: practiceId, userId, user role
- `requireRole()` throws if insufficient permissions
- All database queries scoped by `ctx.practiceId`

### Practice Isolation
- ✅ All queries include `practiceId` in WHERE clause
- ✅ FK relationships enforce practice ownership
- ✅ Services fetch-and-check practice ownership before updates
- ❌ **GAP**: Some cross-entity checks rely on implicit FK enforcement

### Role-Based Access Control

**ADMIN** required for:
- Deleting completed stock count sessions
- Deleting confirmed goods receipts

**STAFF** required for:
- All CRUD operations on orders, items, inventory
- Creating/confirming receipts
- Stock adjustments and transfers
- Managing templates

**VIEWER**: Not implemented in services (UI-level only?)

---

## Transaction Usage Analysis

### withTransaction Pattern
```typescript
return withTransaction(async (tx) => {
  // All database operations
  // Audit logging
  return result;
});
```

- ✅ Used consistently for all write operations
- ✅ Properly propagated to repository methods via `{ tx }` option
- ✅ Automatic rollback on exception
- ✅ Audit logs included in transaction

### Critical Transactions

**1. Confirm Goods Receipt**
- Updates GoodsReceipt status
- Updates LocationInventory (multiple rows)
- Creates StockAdjustment records
- Updates Order status
- Creates audit log
- **Result**: All-or-nothing atomicity

**2. Complete Stock Count**
- Updates StockCountSession status
- Updates LocationInventory (multiple rows)
- Creates StockAdjustment records
- Creates audit log
- **Result**: All-or-nothing atomicity

**3. Transfer Inventory**
- Reduces source LocationInventory
- Increases destination LocationInventory
- Creates InventoryTransfer record
- **Result**: Atomic transfer

---

## Summary of Service Layer Strengths

### Excellent Practices
1. ✅ **Consistent Authorization**: All operations check permissions
2. ✅ **Practice Isolation**: All queries scoped to practiceId
3. ✅ **Transaction Usage**: All write operations are atomic
4. ✅ **Validation First**: Validators throw before state changes
5. ✅ **Audit Trail**: Comprehensive audit logging
6. ✅ **Status Guards**: Immutability enforced (SENT orders, CONFIRMED receipts)
7. ✅ **Quantity Validations**: Positive quantities, non-negative results
8. ✅ **Error Handling**: Appropriate custom exceptions

### Critical Validations
1. ✅ **validateOrderCanBeSent()**: Gate for order sending
2. ✅ **validateReceiptCanBeConfirmed()**: Gate for inventory updates
3. ✅ **validateNonNegativeResult()**: Gate for negative inventory
4. ✅ **validatePositiveQuantity()**: Gate for invalid quantities
5. ✅ **validateTransferLocations()**: Gate for same-location transfers

---

## Identified Gaps in Service Layer

### Missing Validations

**1. Cross-Practice Checks**
- ❌ No explicit validation that OrderItems.itemId belongs to Order.practiceId
- ❌ No explicit validation that GoodsReceipt.orderId belongs to same practice
- Relies on: Implicit FK constraints and fetch-then-check patterns

**2. Empty Collection Checks**
- ❌ No validation preventing removal of last OrderItem (could leave order itemless)
- ❌ No validation preventing removal of last GoodsReceiptLine (could leave receipt lineless)
- Relies on: validateOrderCanBeSent() and validateReceiptCanBeConfirmed() before status change

**3. Quantity Bounds**
- ❌ No maximum quantity checks (could order/receive unrealistic amounts)
- ❌ No validation of quantity against available budget/stock

**4. Supplier Availability**
- ❌ No validation that OrderItems are available from selected Supplier
- ❌ No validation of SupplierCatalog entries when creating orders

**5. Phase 2 Dual-Model Consistency**
- ❌ No validation that supplierId and practiceSupplierId are consistent
- ❌ Error if PracticeSupplier has no legacy migration mapping (transition issue)

**6. Date Validations**
- ❌ validateFutureDate() exists but not consistently used
- ❌ No validation that receivedAt <= expectedAt

### Inconsistent Validations

**1. String Validations**
- validateSku() exists but not used in all relevant places
- validateUrl() exists but not used for supplier websites

**2. GTIN Validation**
- validateGtin() exists but not enforced on Product creation
- Could allow invalid GTINs in database

---

## Recommendations for Service Layer

### High Priority

1. **Add Cross-Practice Validation Helper**
   ```typescript
   validateSamePractice(entity1.practiceId, entity2.practiceId, errorMessage)
   ```

2. **Add Empty Collection Guards**
   - Prevent removal of last OrderItem before order sent
   - Prevent removal of last GoodsReceiptLine before receipt confirmed

3. **Enforce GTIN Validation**
   - Use validateGtin() in Product creation/update
   - Return clear error for invalid GTINs

4. **Add Maximum Quantity Validation**
   - Reasonable upper bounds (e.g., 1,000,000)
   - Prevents data entry errors

### Medium Priority

5. **Add Supplier Availability Check**
   - Validate OrderItems against SupplierCatalog
   - Warn if item not available from selected supplier

6. **Consistent Date Validation**
   - Use validateFutureDate() for Order.expectedAt
   - Add validation that receivedAt is reasonable

7. **Add Phase 2 Consistency Check**
   - Validate supplierId and practiceSupplierId match if both provided

### Low Priority

8. **Add Domain Event Pattern**
   - Emit events for state transitions (OrderSent, ReceiptConfirmed, etc.)
   - Enable decoupled notification/integration logic

9. **Add Computed Helpers**
   - Service methods for common checks (isOrderEditable, etc.)
   - Reduce duplication across UI and API

10. **Add Bulk Operation Support**
    - Bulk confirm receipts
    - Bulk send orders
    - With proper validation and atomicity

