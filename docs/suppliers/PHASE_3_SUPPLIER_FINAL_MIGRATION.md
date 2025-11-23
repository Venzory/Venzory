# Phase 3: Final Supplier Migration - Complete Cleanup

**Date**: November 18, 2025  
**Migration**: `20251118000000_add_practice_supplier_to_templates_and_receipts` + cleanup migration  
**Status**: 🚧 In Progress

---

## Overview

This is the final phase of the supplier migration, completing the transition from the legacy `Supplier` model to the `GlobalSupplier` + `PracticeSupplier` architecture. After this phase, all code will use `PracticeSupplier` exclusively, and the legacy `Supplier` model will be removed from the schema.

## What Changed

### Phase 3.1: Additive Schema Changes (✅ Complete)

Added `practiceSupplierId` columns to the remaining tables:

- **OrderTemplateItem**: Added nullable `practiceSupplierId TEXT` with FK and index
- **GoodsReceipt**: Added nullable `practiceSupplierId TEXT` with FK and index

### Phase 3.2: Data Backfill (✅ Complete)

Ran `scripts/backfill-practice-supplier-final.ts` to populate all `practiceSupplierId` fields:

- **SupplierItem** (formerly SupplierCatalog): 53 entries updated
- **OrderTemplateItem**: 13 entries updated  
- **GoodsReceipt**: 8 entries updated (1 skipped - no supplier)
- **Item**: 0 entries (already migrated in Phase 2)
- **PracticeSupplierItem**: 0 entries (already migrated in Phase 2)

All validation checks passed ✓

**Note**: The legacy `SupplierCatalog` table was migrated to `SupplierItem` in the GS1 backbone migration and subsequently dropped in the cleanup migration.

### Phase 3.3: Code Migration (🚧 In Progress)

Refactoring all code to use `PracticeSupplier` exclusively:

#### Domain Models
- [x] Remove `Supplier` type from `src/domain/models/common.ts`
- [ ] Update `src/domain/models/inventory.ts` to remove `defaultSupplierId` and `supplierId` references
- [ ] Update `src/domain/models/orders.ts` to use `practiceSupplierId` in templates
- [ ] Update `src/domain/models/receiving.ts` to use `practiceSupplierId` in receipts

#### Repositories & Services
- [ ] Update inventory repository and service
- [ ] Update order service (templates and low-stock)
- [ ] Update receiving service
- [ ] Update product repository (supplier catalog)
- [ ] Remove `findPracticeSupplierByMigratedId` from practice supplier repository

#### UI Components
- [ ] Update supplier management UI
- [ ] Update order and template UIs
- [ ] Update supplier catalog UI
- [ ] Update receiving UI
- [ ] Update low-stock and quick reorder UIs

### Phase 3.4: Schema Cleanup (⏳ Pending)

Final migration to drop all legacy supplier artifacts:

- Drop `Supplier` model entirely
- Drop `supplierId` columns from all tables
- Drop `migratedFromSupplierId` from `PracticeSupplier`
- Make `practiceSupplierId` non-nullable where appropriate
- Add new unique constraints for `PracticeSupplier`-based relationships

### Phase 3.5: Tests (⏳ Pending)

- Update existing tests to use `PracticeSupplier`
- Add new migration-specific tests
- Manual verification checklist

---

## Validation Queries

After backfill, all checks passed:

```sql
-- Items with defaultSupplierId but no defaultPracticeSupplierId: 0
SELECT COUNT(*) FROM "Item" 
WHERE "defaultSupplierId" IS NOT NULL 
AND "defaultPracticeSupplierId" IS NULL;

-- SupplierItems (global catalog) - all should have globalSupplierId
SELECT COUNT(*) FROM "SupplierItem" 
WHERE "globalSupplierId" IS NULL;

-- PracticeSupplierItems (practice-specific) - all should have practiceSupplierId
SELECT COUNT(*) FROM "PracticeSupplierItem" 
WHERE "practiceSupplierId" IS NULL;

-- OrderTemplateItems with supplierId but no practiceSupplierId: 0
SELECT COUNT(*) FROM "OrderTemplateItem" 
WHERE "supplierId" IS NOT NULL 
AND "practiceSupplierId" IS NULL;

-- GoodsReceipts with supplierId but no practiceSupplierId: 0
SELECT COUNT(*) FROM "GoodsReceipt" 
WHERE "supplierId" IS NOT NULL 
AND "practiceSupplierId" IS NULL;
```

**Note**: The legacy `SupplierCatalog` table no longer exists. It was replaced by `SupplierItem` (global catalog) and dropped in migration `20251123170800_cleanup_legacy_tables`.

---

## Migration Steps

### Step 1: Additive Schema ✅
- Added columns to `OrderTemplateItem` and `GoodsReceipt`
- Applied migration `20251118000000_add_practice_supplier_to_templates_and_receipts`

### Step 2: Data Backfill ✅
- Ran `npx tsx scripts/backfill-practice-supplier-final.ts --apply`
- All validation checks passed

### Step 3: Code Migration 🚧
- Currently refactoring domain models, services, and UI

### Step 4: Schema Cleanup ⏳
- Will drop legacy `Supplier` model and columns
- Will tighten constraints

### Step 5: Testing ⏳
- Will update and verify all tests

---

## Rollback Plan

**Before Step 4 (Schema Cleanup):**
- Revert code changes
- Leave extra columns in place (they're nullable and harmless)

**After Step 4:**
- Requires database restore from backup
- Document as "point of no return"

---

## Files Modified

### Schema
- `prisma/schema.prisma` - Added `practiceSupplierId` to templates and receipts

### Scripts
- `scripts/backfill-practice-supplier-final.ts` - Final backfill script
- `package.json` - Added `backfill:practice-supplier-final` command

### Migrations
- `prisma/migrations/20251118000000_add_practice_supplier_to_templates_and_receipts/migration.sql`

### Documentation
- `docs/suppliers/PHASE_3_SUPPLIER_FINAL_MIGRATION.md` (this file)

---

## Next Actions

1. Complete code migration (domain models, services, UI)
2. Create and apply cleanup migration
3. Update and verify tests
4. Deploy to staging for verification
5. Deploy to production

---

**Migration Started**: November 18, 2025  
**Expected Completion**: TBD  
**Status**: Phase 3.3 (Code Migration) in progress

