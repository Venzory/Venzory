# Phase 2: Supplier Integration Migration

**Date**: November 11, 2025  
**Migration**: `20251111122948_add_practice_supplier_to_orders_items`  
**Status**: ✅ Applied and Verified

---

## Overview

Phase 2 integrates the GlobalSupplier and PracticeSupplier architecture (from Phase 1) into the core business flows for Orders and Items. This enables practices to use practice-specific supplier relationships while maintaining backward compatibility with the legacy Supplier model.

## What Changed

### Database Schema Changes

This migration adds nullable foreign key columns to enable a **dual-supplier pattern** during the transition period:

#### 1. **Order Table**
```sql
ALTER TABLE "Order" ADD COLUMN "practiceSupplierId" TEXT;
CREATE INDEX "Order_practiceSupplierId_idx" ON "Order"("practiceSupplierId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_practiceSupplierId_fkey" 
  FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Purpose**: Allows orders to reference a PracticeSupplier while maintaining the required `supplierId` for backward compatibility.

#### 2. **SupplierItem Table**
```sql
ALTER TABLE "SupplierItem" ADD COLUMN "practiceSupplierId" TEXT;
CREATE INDEX "SupplierItem_practiceSupplierId_idx" ON "SupplierItem"("practiceSupplierId");
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_practiceSupplierId_fkey" 
  FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Purpose**: Links item-supplier pricing to PracticeSupplier for practice-specific pricing.

#### 3. **Item Table**
```sql
ALTER TABLE "Item" ADD COLUMN "defaultPracticeSupplierId" TEXT;
CREATE INDEX "Item_defaultPracticeSupplierId_idx" ON "Item"("defaultPracticeSupplierId");
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultPracticeSupplierId_fkey" 
  FOREIGN KEY ("defaultPracticeSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Purpose**: Allows items to have a PracticeSupplier as their default supplier alongside the legacy `defaultSupplierId`.

### Key Design Decisions

#### Nullable Columns
All new columns are **nullable** to:
- Allow gradual migration without breaking existing data
- Support both supplier systems simultaneously
- Enable rollback if needed

#### ON DELETE SET NULL
Foreign keys use `SET NULL` instead of `CASCADE` to:
- Preserve historical order data if a PracticeSupplier link is removed
- Prevent accidental data loss
- Allow independent supplier management

#### Dual-ID Pattern
Records store both `supplierId` (required) and `practiceSupplierId` (optional):
- **Read Priority**: Check practiceSupplierId first, fall back to supplierId
- **Write Strategy**: New records can use either system based on user choice
- **Backward Compatibility**: All existing code continues to work

---

## Application Layer Changes

### New Repository: PracticeSupplierRepository

**File**: `src/repositories/suppliers/practice-supplier-repository.ts`

Provides complete CRUD operations for:
- PracticeSupplier management
- GlobalSupplier management
- Linking practices to global suppliers
- Searching and filtering suppliers

### Updated: OrderService

**File**: `src/services/orders/order-service.ts`

**New Methods**:
- `resolveSupplierIds()` - Intelligently resolves both supplier IDs
- `getSupplierDisplayName()` - Displays practice-specific supplier names

**Key Features**:
- Accepts either `supplierId` OR `practiceSupplierId` in CreateOrderInput
- Automatically derives legacy supplierId from PracticeSupplier when needed
- Checks for blocked suppliers (`isBlocked = true`)
- Validates at least one supplier ID is provided
- Maintains full backward compatibility

### Updated Domain Models

**Files**:
- `src/domain/models/suppliers.ts` (NEW)
- `src/domain/models/orders.ts` (UPDATED)
- `src/domain/models/inventory.ts` (UPDATED)

All interfaces now support optional PracticeSupplier references.

---

## Usage Examples

### Creating Orders

#### With PracticeSupplier (New System)
```typescript
const order = await orderService.createOrder(ctx, {
  practiceSupplierId: 'ps_abc123',
  items: [
    { itemId: 'item_1', quantity: 10, unitPrice: 5.99 }
  ],
  notes: 'Regular monthly order'
});
```

#### With Legacy Supplier (Backward Compatible)
```typescript
const order = await orderService.createOrder(ctx, {
  supplierId: 'supplier_xyz789',
  items: [
    { itemId: 'item_1', quantity: 10, unitPrice: 5.99 }
  ],
  notes: 'Regular monthly order'
});
```

### Querying PracticeSuppliers

```typescript
// Get all active suppliers for a practice
const suppliers = await practiceSupplierRepository.findPracticeSuppliers(
  practiceId,
  { includeBlocked: false }
);

// Get preferred suppliers only
const preferred = await practiceSupplierRepository.findPracticeSuppliers(
  practiceId,
  { preferredOnly: true }
);

// Find by global supplier ID
const link = await practiceSupplierRepository.findPracticeSupplierByGlobalId(
  practiceId,
  globalSupplierId
);
```

### Displaying Supplier Information

```typescript
// Works for both supplier systems
function getSupplierName(order: OrderWithRelations): string {
  // Prefer PracticeSupplier with custom label
  if (order.practiceSupplier) {
    return order.practiceSupplier.customLabel 
      || order.practiceSupplier.globalSupplier?.name 
      || 'Unknown';
  }
  
  // Fall back to legacy supplier
  return order.supplier?.name ?? 'Unknown';
}
```

---

## Backward Compatibility

### 100% Compatible
- All existing orders continue to work with `supplierId` only
- All existing API endpoints unchanged
- All existing UI components work without modification
- No breaking changes to any existing functionality

### Automatic Forward Compatibility
When a legacy `supplierId` is provided, the service layer:
1. Validates the supplier exists
2. Attempts to find corresponding PracticeSupplier via `migratedFromSupplierId`
3. Automatically populates `practiceSupplierId` if found
4. Ensures future queries can filter by either supplier type

---

## Migration Path

### Phase 1 (Complete)
✅ Created GlobalSupplier and PracticeSupplier models  
✅ Backfilled existing suppliers  
✅ Admin verification dashboard

### Phase 2 (This Migration - Complete)
✅ Added PracticeSupplier support to Orders  
✅ Added PracticeSupplier support to Items  
✅ Added PracticeSupplier support to SupplierItems  
✅ Implemented dual-supplier pattern in services  
✅ Backend fully functional

### Phase 3 (Future)
⏳ Update UI to expose PracticeSupplier selection  
⏳ Migrate SupplierCatalog to GlobalSupplier  
⏳ Update integration systems (EDI, API, OCI)  
⏳ Add cross-practice supplier features

### Phase 4 (Future)
⏳ Remove legacy Supplier model  
⏳ Clean up dual-ID pattern  
⏳ Make practiceSupplierId required  
⏳ Complete migration

---

## Rollback Plan

If rollback is needed:

### 1. Stop Using New Fields
Update application code to only use legacy supplier IDs.

### 2. Remove Foreign Keys
```sql
ALTER TABLE "Order" DROP CONSTRAINT "Order_practiceSupplierId_fkey";
ALTER TABLE "SupplierItem" DROP CONSTRAINT "SupplierItem_practiceSupplierId_fkey";
ALTER TABLE "Item" DROP CONSTRAINT "Item_defaultPracticeSupplierId_fkey";
```

### 3. Drop Indexes
```sql
DROP INDEX "Order_practiceSupplierId_idx";
DROP INDEX "SupplierItem_practiceSupplierId_idx";
DROP INDEX "Item_defaultPracticeSupplierId_idx";
```

### 4. Drop Columns
```sql
ALTER TABLE "Order" DROP COLUMN "practiceSupplierId";
ALTER TABLE "SupplierItem" DROP COLUMN "practiceSupplierId";
ALTER TABLE "Item" DROP COLUMN "defaultPracticeSupplierId";
```

**Note**: Since columns are nullable and not required, the system continues to work normally during the rollback process. No data loss occurs.

---

## Verification

### Check Migration Status
```bash
npx prisma migrate status
# Should show: Database schema is up to date!
```

### Verify Tables
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('Order', 'Item', 'SupplierItem') 
  AND column_name LIKE '%practiceSupplier%';

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE indexname LIKE '%practiceSupplier%';

-- Check foreign keys exist
SELECT conname FROM pg_constraint 
WHERE conname LIKE '%practiceSupplier%';
```

### Test Creating Orders
```typescript
// Test with PracticeSupplier
const order1 = await orderService.createOrder(ctx, {
  practiceSupplierId: 'ps_test',
  items: [{ itemId: 'item_1', quantity: 1, unitPrice: 10 }],
});

// Test with legacy Supplier
const order2 = await orderService.createOrder(ctx, {
  supplierId: 'supplier_test',
  items: [{ itemId: 'item_1', quantity: 1, unitPrice: 10 }],
});

// Both should succeed
```

---

## Performance Considerations

### Indexes
All new foreign key columns are indexed for efficient queries:
- `Order_practiceSupplierId_idx`
- `SupplierItem_practiceSupplierId_idx`
- `Item_defaultPracticeSupplierId_idx`

### Query Performance
- No impact on existing queries (columns are nullable)
- New queries can efficiently filter by PracticeSupplier
- JOIN performance maintained with proper indexes

### Storage Impact
- Minimal: ~32 bytes per record (one TEXT column per table)
- Nullable columns only use storage when populated
- Indexes add minimal overhead

---

## Next Steps

### Immediate (Optional)
1. Update UI components to expose PracticeSupplier selection
2. Add visual indicators for which supplier system is in use
3. Create user documentation for the new supplier system

### Short-term (Phase 3)
1. Migrate SupplierCatalog to use GlobalSupplier
2. Update product-supplier associations
3. Add cross-practice supplier search

### Long-term (Phase 4)
1. Complete UI migration to PracticeSupplier
2. Deprecate legacy Supplier model
3. Remove dual-ID pattern
4. Clean up backward compatibility code

---

## Support

### Related Documentation
- `PHASE_1_MIGRATION_COMPLETE.md` - Phase 1 foundation
- `PHASE_2_IMPLEMENTATION_STATUS.md` - Implementation details
- `docs/GLOBAL_SUPPLIER_MIGRATION.md` - Overall migration guide

### Database Migration
- File: `prisma/migrations/20251111122948_add_practice_supplier_to_orders_items/migration.sql`
- Applied: ✅ Yes (marked as applied without data reset)
- Reversible: ✅ Yes (see Rollback Plan above)

### Questions or Issues?
1. Check migration status: `npx prisma migrate status`
2. Review implementation status document
3. Test with both supplier types in development
4. Verify backward compatibility with existing orders

---

**Migration Completed**: November 11, 2025  
**Status**: ✅ Production Ready (Backend)  
**Next Phase**: UI Integration (Optional)

