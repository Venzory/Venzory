# Migration: Formalize Remaining Drift

**Date**: 2025-11-16  
**Type**: Schema Enhancement (Idempotent)  
**Risk**: Low  
**Breaking**: No

## Purpose

This migration formalizes the remaining schema drift items that were previously applied via `prisma db push` during development. These items exist in `schema.prisma` but were not backed by migration files.

## What Changed

### 1. LocationInventory.createdAt Column

- **Type**: Audit timestamp
- **Purpose**: Track when inventory records are created
- **Default**: `CURRENT_TIMESTAMP`
- **Impact**: Low - informational only, not used in business logic

### 2. Order Composite Index

- **Index**: `(practiceId, status, createdAt)`
- **Purpose**: Performance optimization for order list queries
- **Benefit**: Speeds up queries that filter orders by practice and status, sorted by creation date
- **Impact**: Low - improves query performance

### 3. LocationInventory Composite Index

- **Index**: `(itemId, reorderPoint, quantity)`
- **Purpose**: Performance optimization for reorder point queries
- **Benefit**: Speeds up queries checking which items need reordering
- **Impact**: Low - improves query performance

## Idempotency

This migration is **idempotent** - it can be safely run multiple times:

- Uses `IF NOT EXISTS` checks for column addition
- Uses `CREATE INDEX IF NOT EXISTS` for indexes
- No errors if items already exist
- No data loss

## Deployment Strategy

### For Databases Created via `prisma db push`

These databases likely already have these items. The migration will:
- Skip the column add (already exists)
- Skip the index creation (already exist)
- Complete successfully with notices

### For Databases Created via `prisma migrate deploy`

These databases don't have these items. The migration will:
- Add the `createdAt` column with default value
- Create both indexes
- Complete successfully

## Testing

Before deploying to production:

```bash
# 1. Apply to local dev database
npx prisma migrate deploy

# 2. Verify no errors
npx prisma migrate status

# 3. Check that indexes exist
npx tsx scripts/verify-constraints.ts

# 4. Test on staging
DATABASE_URL=$STAGING_URL npx prisma migrate deploy
```

## Rollback

If needed, these changes can be rolled back:

```sql
-- Remove column (will lose createdAt data)
ALTER TABLE "LocationInventory" DROP COLUMN IF EXISTS "createdAt";

-- Remove indexes
DROP INDEX IF EXISTS "Order_practiceId_status_createdAt_idx";
DROP INDEX IF EXISTS "LocationInventory_itemId_reorderPoint_quantity_idx";
```

**Note**: Rollback is rarely needed as these are non-breaking enhancements.

## Performance Considerations

- **Column addition**: Instant on existing rows (uses default value)
- **Index creation**: May take a few seconds on large tables
  - `Order` table: Typically < 1 second for small/medium datasets
  - `LocationInventory` table: Typically < 1 second for small/medium datasets
- **No downtime required**: Indexes created online, no blocking

## Related Documentation

- `docs/MIGRATION_STATUS.md` - Documents this drift and its resolution
- `docs/OPS_RUNBOOK.md` - Deployment procedures
- `DOMAIN_RULES.md` - Business rules and constraints

## Success Criteria

✅ Migration applies without errors  
✅ `prisma migrate status` shows "up to date"  
✅ Application continues to function normally  
✅ No performance degradation  
✅ Indexes visible in database schema

