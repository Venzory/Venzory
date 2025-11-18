# Migration Status and Notes

## Current State

### Applied Migrations

1. `20251105171437_init` - Initial schema
2. `20251106200124_add_gs1_foundation` - GS1 product foundation
3. `20251108011331_add_receiving_module` - Receiving module
4. `20251108113748_remove_order_item_receipt` - Remove order item receipt
5. `20251111112724_add_global_and_practice_suppliers` - **Phase 1: Global Supplier Architecture** ✨
6. `20251111122948_add_practice_supplier_to_orders_items` - Phase 2: PracticeSupplier support
7. `20251111140000_add_ondelete_policies_and_constraints` - **Database Constraint Hardening: onDelete policies & supplier uniques** ✨
8. `20251111140500_add_partially_received_status` - Add PARTIALLY_RECEIVED order status
9. `20251111141000_add_check_constraints` - **Database Constraint Hardening: CHECK constraints** ✨
10. `20251113180000_add_unique_constraints_items_locations` - **Database Constraint Hardening: Item & Location uniques** ✨
11. `20251116000000_formalize_remaining_drift` - **Formalize remaining drift: createdAt column & performance indexes** ✨

### Schema Drift Notes

**Most drift has been resolved via migrations!** ✅

The following items that were previously drift have now been formalized:

- ~~`OrderStatus` enum: Added `PARTIALLY_RECEIVED` variant~~ ✅ **RESOLVED** (migration `20251111140500_add_partially_received_status`)
- ~~`Item` table: Unique constraint on `(practiceId, name)`~~ ✅ **RESOLVED** (migration `20251113180000_add_unique_constraints_items_locations`)
- ~~`Item` table: Partial unique index on `(practiceId, sku) WHERE sku IS NOT NULL`~~ ✅ **RESOLVED** (migration `20251113180000_add_unique_constraints_items_locations`)
- ~~`Location` table: Partial unique index on `(practiceId, code) WHERE code IS NOT NULL`~~ ✅ **RESOLVED** (migration `20251113180000_add_unique_constraints_items_locations`)

**Remaining Drift**: ✅ **ALL RESOLVED**

The following items have now been formalized via migration `20251116000000_formalize_remaining_drift`:

- ~~`LocationInventory` table: `createdAt` column~~ ✅ **RESOLVED**
- ~~`Order` table: Composite index on `(practiceId, status, createdAt)`~~ ✅ **RESOLVED**
- ~~`LocationInventory` table: Index on `[itemId, reorderPoint, quantity]`~~ ✅ **RESOLVED**

**Current Status**: No remaining drift! All schema items in `schema.prisma` are now backed by migrations.

**Note**: The drift formalization migration is **idempotent** - it can be safely applied to databases that already have these items (from prior `db push` usage) as well as fresh databases.

## Database Constraint Hardening (Migrations 7, 9, 10)

**Migrations**: 
- `20251111140000_add_ondelete_policies_and_constraints`
- `20251111141000_add_check_constraints`
- `20251113180000_add_unique_constraints_items_locations`

**Status**: ✅ Implemented and Documented  
**Documentation**: See `docs/migrations/database-constraint-hardening.md` and `DOMAIN_RULES.md`

### What Was Added

**onDelete Policies (Migration 7)**:
- User references: `onDelete: SetNull` (preserves audit trail)
- Supplier references: `onDelete: SetNull` (preserves order history)
- Location references in transfers: `onDelete: Restrict` (preserves audit trail)
- PracticeSupplier migration tracking FK

**Unique Constraints (Migrations 7 & 10)**:
- `GlobalSupplier.name` - prevents duplicate global suppliers
- `Supplier(practiceId, name)` - prevents duplicate suppliers per practice
- `Item(practiceId, name)` - prevents duplicate item names per practice
- `Item(practiceId, sku)` - partial unique (WHERE sku IS NOT NULL)
- `Location(practiceId, code)` - partial unique (WHERE code IS NOT NULL)

**CHECK Constraints (Migration 9)**:
- Inventory: `quantity >= 0` (P1 CRITICAL for Magento)
- Quantities: positive in OrderItem, GoodsReceiptLine, InventoryTransfer
- Transfers: prevents same-location transfers
- Adjustments: prevents zero-quantity adjustments
- Status timestamps: SENT orders have sentAt, CONFIRMED receipts have receivedAt, etc.
- Prices: non-negative in OrderItem, SupplierItem, SupplierCatalog
- Reorder settings: non-negative reorderPoint, positive reorderQuantity
- Min order quantities: positive where applicable

### Verification

```bash
# Check constraint violations
npx tsx scripts/run-validation-queries.ts

# Check for duplicate data
npx tsx scripts/check-duplicates.ts

# Verify constraints are present in DB
npx tsx scripts/verify-constraints.ts
```

### Backward Compatibility

✅ All existing service-layer validation unchanged  
✅ Constraints match existing business rules  
✅ No breaking changes to application code  
✅ User-friendly error messages via constraint error handler

## Phase 1: Global Supplier Architecture

**Migration**: `20251111112724_add_global_and_practice_suppliers`  
**Status**: ✅ Applied and Verified  
**Documentation**: See `GLOBAL_SUPPLIER_MIGRATION.md`

### What Was Added

- `GlobalSupplier` table - Platform-wide supplier data
- `PracticeSupplier` table - Practice-to-supplier links with practice-specific settings
- All necessary indexes and foreign keys
- Migration tracking field for data backfill

### Verification

```bash
# Check migration status
npx prisma migrate status

# View verification dashboard
# Navigate to /admin/supplier-migration (admin access required)

# Run backfill script (dry-run)
npm run backfill:suppliers
```

### Backward Compatibility

✅ All existing Supplier model code unchanged  
✅ SupplierCatalog continues to work  
✅ Order creation unchanged  
✅ Receiving flows unchanged  
✅ No breaking changes

## For Production Deployment

### Option 1: Fresh Database
If deploying to a fresh database:
```bash
npx prisma migrate deploy
```

### Option 2: Existing Database with Data
If deploying to an existing database:
```bash
# Apply migrations
npx prisma migrate deploy

# Then run backfill script
npm run backfill:suppliers -- --apply
```

### Option 3: Existing Database with Drift
If the target database has similar drift:
```bash
# Mark drifted changes as applied manually or use db push
npx prisma db push --accept-data-loss=false

# Then run backfill
npm run backfill:suppliers -- --apply
```

## Next Phase Planning

### Phase 2: Supplier Catalog Migration
- Update `SupplierCatalog` to reference `GlobalSupplier`
- Migrate supplier catalog data
- Update order creation flows
- Update UI components

### Phase 3: Deprecate Legacy Supplier
- Remove legacy `Supplier` model
- Clean up old references
- Complete migration to new architecture

---

## Drift Cleanup - COMPLETED ✅

### Previously Drifted Items (Now Resolved)

All drift items have been formalized via migration `20251116000000_formalize_remaining_drift`:

1. **LocationInventory.createdAt column** ✅
   - Type: Audit timestamp
   - Now: Backed by migration, added with default value
   - Migration: Idempotent (skips if already exists)

2. **Order composite index on (practiceId, status, createdAt)** ✅
   - Type: Performance optimization
   - Now: Backed by migration
   - Benefit: Speeds up order list queries filtered by practice and status

3. **LocationInventory index on [itemId, reorderPoint, quantity]** ✅
   - Type: Performance optimization
   - Now: Backed by migration
   - Benefit: Speeds up reorder point queries

### Detection

To detect which drift items exist in your database:

```bash
# Use Prisma's migrate diff to see what's different
npx prisma migrate diff \
  --from-url="$DATABASE_URL" \
  --to-schema-datasource \
  --script > drift-analysis.sql

# Review the output to see what Prisma thinks needs to change
```

### Remediation Options

**Option 1: Create a follow-up migration (recommended for consistency)**
- Generate a migration that adds these items
- Apply it to all environments via `prisma migrate deploy`
- Benefits: All environments consistent, proper migration history

**Option 2: Mark as resolved (if already present in all live DBs)**
- If all staging/prod DBs already have these via `db push`
- Use `prisma migrate resolve` to mark a migration as applied without running it
- Benefits: No schema changes needed

**Option 3: Leave as-is (acceptable for now)**
- These are non-critical optimizations
- Can be addressed in a future maintenance window
- Benefits: No immediate action required

### Deployment of Drift Formalization Migration

To apply the drift formalization migration:

```bash
# Local/Dev
npx prisma migrate deploy

# Staging
DATABASE_URL=$STAGING_URL npx prisma migrate deploy

# Production
DATABASE_URL=$PRODUCTION_URL npx prisma migrate deploy
```

**Note**: This migration is safe to apply to all environments. It's idempotent and will skip items that already exist.

### Going Forward

**Policy**: Avoid `prisma db push` in favor of proper migrations (`prisma migrate dev` in development, `prisma migrate deploy` in staging/prod) to prevent future drift.

---

**Last Updated**: November 16, 2025  
**Schema Version**: Phase 1 Complete + Constraint Hardening Complete + All Drift Resolved  
**Drift Status**: ✅ **NONE** - All schema items backed by migrations

