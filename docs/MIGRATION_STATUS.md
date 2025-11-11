# Migration Status and Notes

## Current State

### Applied Migrations

1. `20251105171437_init` - Initial schema
2. `20251106200124_add_gs1_foundation` - GS1 product foundation
3. `20251108011331_add_receiving_module` - Receiving module
4. `20251108113748_remove_order_item_receipt` - Remove order item receipt
5. `20251111112724_add_global_and_practice_suppliers` - **Phase 1: Global Supplier Architecture** ✨

### Schema Drift Notes

The database has some additional changes that were applied via `prisma db push` during development and are not yet in migration files:

- `OrderStatus` enum: Added `PARTIALLY_RECEIVED` variant
- `Item` table: Added composite indexes on `(practiceId, name)` and `(practiceId, sku)`
- `LocationInventory` table: Added `createdAt` column
- `Order` table: Added composite index on `(practiceId, status, createdAt)`

**Impact**: These changes are functional and working in production. They will need to be formalized in a future migration when convenient.

**Recommendation**: For new deployments, use `prisma db push` to sync the schema until these drifted changes are formalized.

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

**Last Updated**: November 11, 2025  
**Schema Version**: Phase 1 Complete

