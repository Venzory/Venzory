# Global Supplier Architecture - Phase 1 Migration

**Date**: November 11, 2025  
**Migration**: `20251111112724_add_global_and_practice_suppliers`  
**Status**: ✅ Applied

---

## Overview

This migration introduces the foundation for a global supplier architecture that supports platform-wide supplier management while maintaining backward compatibility with the existing practice-scoped Supplier model.

## What Changed

### New Tables

#### 1. **GlobalSupplier**
Stores supplier data at the platform level, enabling suppliers to be shared across multiple practices.

**Columns:**
- `id` - Primary key (CUID)
- `name` - Supplier name (required)
- `email` - Contact email
- `phone` - Contact phone
- `website` - Supplier website
- `notes` - General notes about the supplier
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

**Indexes:**
- `GlobalSupplier_name_idx` - Index on name for efficient searching

#### 2. **PracticeSupplier**
Links practices to global suppliers with practice-specific settings and preferences.

**Columns:**
- `id` - Primary key (CUID)
- `practiceId` - Reference to Practice (required)
- `globalSupplierId` - Reference to GlobalSupplier (required)
- `accountNumber` - Practice's account number at this supplier
- `customLabel` - Practice-specific display name override
- `orderingNotes` - Practice-specific ordering/delivery notes
- `isPreferred` - Flag for preferred suppliers (default: false)
- `isBlocked` - Flag for blocked suppliers (default: false)
- `migratedFromSupplierId` - Original Supplier ID for migration tracking
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

**Indexes:**
- `PracticeSupplier_practiceId_idx` - Index on practiceId
- `PracticeSupplier_globalSupplierId_idx` - Index on globalSupplierId
- `PracticeSupplier_migratedFromSupplierId_idx` - Index on migration tracking field
- `PracticeSupplier_practiceId_globalSupplierId_key` - Unique constraint on (practiceId, globalSupplierId)

**Foreign Keys:**
- `practiceId` → `Practice.id` (CASCADE on delete)
- `globalSupplierId` → `GlobalSupplier.id` (CASCADE on delete)

## Migration Strategy

### Backward Compatibility
- **The existing `Supplier` model remains unchanged**
- All existing code, services, and UI components continue to work
- `SupplierCatalog` still references the legacy `Supplier` model
- Orders, receiving, and other flows are unaffected

### Data Migration
The migration includes a backfill script to populate the new tables from existing data:

```bash
# Dry-run mode (preview only)
npm run backfill:suppliers

# Apply migration
npm run backfill:suppliers -- --apply
```

**Backfill Strategy:**
- Creates one `GlobalSupplier` per existing `Supplier` record (1:1 mapping)
- Creates one `PracticeSupplier` link for each supplier-practice relationship
- Stores original Supplier ID in `migratedFromSupplierId` for traceability

## Verification

### Admin Dashboard
Access the migration verification page at:
```
/admin/supplier-migration
```

This page shows:
- Migration statistics
- Side-by-side comparison of old vs new architecture
- Migration status for each supplier
- Visual indicators for completion

### Database Queries

Check GlobalSuppliers:
```sql
SELECT COUNT(*) FROM "GlobalSupplier";
```

Check PracticeSupplier links:
```sql
SELECT COUNT(*) FROM "PracticeSupplier";
```

Check migrated records:
```sql
SELECT COUNT(*) FROM "PracticeSupplier" 
WHERE "migratedFromSupplierId" IS NOT NULL;
```

## Rollback Plan

If needed, the migration can be rolled back:

```bash
# Revert the migration
npx prisma migrate resolve --rolled-back 20251111112724_add_global_and_practice_suppliers

# Drop the tables manually
psql -d venzory -c 'DROP TABLE "PracticeSupplier" CASCADE;'
psql -d venzory -c 'DROP TABLE "GlobalSupplier" CASCADE;'
```

**Note:** This will delete all data in the new tables. The legacy Supplier model and data remain intact.

## Next Steps (Phase 2)

Future phases will:
1. Refactor `SupplierCatalog` to use `GlobalSupplier` instead of `Supplier`
2. Update order creation to work with `PracticeSupplier`
3. Migrate UI components to use the new architecture
4. Add cross-practice supplier search and selection
5. Eventually deprecate the legacy `Supplier` model

## Files Changed

### Schema
- `prisma/schema.prisma` - Added GlobalSupplier and PracticeSupplier models

### Scripts
- `scripts/backfill-global-suppliers.ts` - Migration script with dry-run mode
- `package.json` - Added `backfill:suppliers` command

### Seed Data
- `prisma/seed.ts` - Updated to populate new models alongside legacy

### Admin UI
- `app/(dashboard)/admin/supplier-migration/page.tsx` - Verification dashboard

## Testing

### Automated Tests
- ✅ Schema migration applied successfully
- ✅ Seed data populates both architectures
- ✅ Backfill script works in dry-run mode
- ✅ Application builds without TypeScript errors
- ✅ No breaking changes to existing functionality

### Manual Testing Checklist
- [ ] Access `/admin/supplier-migration` as admin
- [ ] Run backfill script in dry-run mode
- [ ] Verify statistics match expectations
- [ ] Create new order using existing supplier flow
- [ ] Verify receiving flow works unchanged
- [ ] Check supplier pages still display correctly

## Support

For questions or issues with this migration:
1. Check the verification dashboard at `/admin/supplier-migration`
2. Review migration logs from the backfill script
3. Consult the implementation plan in the project documentation

---

**Migration Author**: AI Assistant  
**Reviewed By**: [To be filled]  
**Production Deploy Date**: [To be scheduled]

