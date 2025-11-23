# Database Constraint Hardening Migration Guide

**Migration Date**: 2025-11-11
**Version**: 1.0
**Status**: Ready for deployment
**Risk Level**: Medium (schema changes)

---

## Executive Summary

This migration adds critical database-level constraints to enforce business invariants that were previously only validated at the service layer. The changes provide defense-in-depth protection against data corruption and are essential prerequisites for Magento integration.

### What Changed

1. **onDelete Policies**: Added to 15+ foreign key relationships
2. **CHECK Constraints**: Added 17 new validation rules
3. **Unique Constraints**: Added 5 new uniqueness rules (suppliers, items, locations)
4. **Foreign Keys**: Added 1 new FK for migration tracking

### Benefits

- ✅ Prevents negative inventory (critical for Magento)
- ✅ Prevents invalid quantities (zero or negative)
- ✅ Ensures status-timestamp consistency
- ✅ Prevents data corruption from direct DB access
- ✅ Preserves audit trail when users/suppliers are deleted
- ✅ Provides clear, user-friendly error messages

### Estimated Downtime

- **None required** for read-heavy workloads
- Migrations apply instantly (<1 second per constraint)
- No data transformation needed

---

## Prerequisites

### Before Migration

1. **Backup Database**
   ```bash
   pg_dump $DATABASE_URL > backup_before_constraints_$(date +%Y%m%d).sql
   ```

2. **Verify Data Compliance**
   Run validation queries to ensure existing data doesn't violate new constraints:
   ```bash
   psql $DATABASE_URL -f prisma/validation-queries.sql
   ```

3. **Test on Staging**
   Apply migrations to a staging environment first:
   ```bash
   DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy
   ```

4. **Update Application Code**
   Ensure error handling utilities are deployed:
   - `src/lib/database/constraint-error-handler.ts`
   - `src/domain/validators/index.ts` (new validators)

---

## Migration Files

### 1. onDelete Policies and Unique Constraints (Suppliers)
**File**: `prisma/migrations/20251111140000_add_ondelete_policies_and_constraints/migration.sql`

**Changes**:
- Makes `createdById` nullable in 6 tables
- Adds `onDelete: SetNull` to all User references
- Adds `onDelete: SetNull` to all Supplier references
- Adds `onDelete: Restrict` to Location references in transfers
- Adds unique constraint on `GlobalSupplier.name`
- Adds unique constraint on `Supplier(practiceId, name)`
- Adds FK for `PracticeSupplier.migratedFromSupplierId`

**Risk**: Low (adds flexibility, doesn't restrict)

### 2. CHECK Constraints
**File**: `prisma/migrations/20251111141000_add_check_constraints/migration.sql`

**Changes**:
- Prevents negative inventory
- Prevents zero/negative quantities
- Prevents same-location transfers
- Enforces status-dependent timestamps
- Validates reorder settings
- Validates prices
- Validates min order quantities

**Risk**: Medium (could fail if data violates constraints)

### 3. Unique Constraints (Items and Locations)
**File**: `prisma/migrations/20251113180000_add_unique_constraints_items_locations/migration.sql`

**Changes**:
- Adds unique constraint on `Item(practiceId, name)`
- Adds partial unique index on `Item(practiceId, sku) WHERE sku IS NOT NULL`
- Adds partial unique index on `Location(practiceId, code) WHERE code IS NOT NULL`

**Risk**: Medium (could fail if duplicate data exists)

---

## Deployment Steps

### Step 1: Pre-Deployment Validation

```bash
# Navigate to project directory
cd /path/to/Venzory

# Run validation queries
npx tsx scripts/run-validation-queries.ts

# Expected output: "No constraint violations found!"

# Run duplicate detection (for item/location unique constraints)
npx tsx scripts/check-duplicates.ts

# Expected output: "No duplicates found!"
```

If violations are found:
- Review the output carefully
- Fix invalid data or adjust constraints
- Document decisions

### Step 2: Deploy to Staging

```bash
# Set staging database URL
export DATABASE_URL=$STAGING_DATABASE_URL

# Deploy migrations
npx prisma migrate deploy

# Verify migrations applied
npx prisma migrate status

# Run tests
npm test -- tests/integration/database-constraints.test.ts
```

### Step 3: Deploy to Production

```bash
# Create backup
pg_dump $DATABASE_URL > backup_before_constraints_$(date +%Y%m%d).sql

# Deploy migrations
npx prisma migrate deploy

# Verify migrations applied
npx prisma migrate status

# Monitor logs for 10 minutes
# Watch for constraint violation errors
```

### Step 4: Post-Deployment Verification

```bash
# Run validation queries again
npx tsx scripts/run-validation-queries.ts

# Run integration tests
npm test -- tests/integration/database-constraints.test.ts

# Check application logs for errors
# Verify key flows work: create order, receive goods, adjust stock
```

---

## Rollback Plan

If issues arise, you can rollback the migrations:

### Rollback CHECK Constraints

```sql
-- Remove all CHECK constraints (safe, doesn't affect data)
ALTER TABLE "LocationInventory" DROP CONSTRAINT IF EXISTS "check_quantity_non_negative";
ALTER TABLE "LocationInventory" DROP CONSTRAINT IF EXISTS "check_reorder_point_non_negative";
ALTER TABLE "LocationInventory" DROP CONSTRAINT IF EXISTS "check_reorder_quantity_positive";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "check_quantity_positive";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "check_unitPrice_non_negative";
ALTER TABLE "GoodsReceiptLine" DROP CONSTRAINT IF EXISTS "check_quantity_positive";
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT IF EXISTS "check_quantity_positive";
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT IF EXISTS "check_different_locations";
ALTER TABLE "StockAdjustment" DROP CONSTRAINT IF EXISTS "check_quantity_not_zero";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "check_sent_has_sentAt";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "check_received_has_receivedAt";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "check_partially_received_has_receivedAt";
ALTER TABLE "GoodsReceipt" DROP CONSTRAINT IF EXISTS "check_confirmed_has_receivedAt";
ALTER TABLE "SupplierItem" DROP CONSTRAINT IF EXISTS "check_unitPrice_non_negative";
ALTER TABLE "SupplierItem" DROP CONSTRAINT IF EXISTS "check_minOrderQty_positive";
ALTER TABLE "PracticeSupplierItem" DROP CONSTRAINT IF EXISTS "check_unitPrice_non_negative";
ALTER TABLE "PracticeSupplierItem" DROP CONSTRAINT IF EXISTS "check_minOrderQty_positive";
```

### Rollback onDelete Policies

**CAUTION**: Reverting onDelete policies is more complex and may require:
1. Restoring from backup
2. Re-generating Prisma client
3. Re-deploying application

Only rollback if absolutely necessary. Consider keeping CHECK constraints rollback only.

---

## Troubleshooting

### Issue: Constraint Violation During Migration

**Symptom**: Migration fails with "violates check constraint"

**Solution**:
1. Identify which constraint failed
2. Run specific validation query for that constraint
3. Fix or delete offending records
4. Re-run migration

**Example**:
```sql
-- If check_quantity_non_negative fails:
SELECT * FROM "LocationInventory" WHERE quantity < 0;

-- Fix by setting to zero or deleting:
UPDATE "LocationInventory" SET quantity = 0 WHERE quantity < 0;
-- OR
DELETE FROM "LocationInventory" WHERE quantity < 0;
```

### Issue: Application Throws "violates check constraint"

**Symptom**: Application errors after migration

**Solution**:
1. Check error message for constraint name
2. Review application code for validation gaps
3. Fix validation in service layer
4. Deploy code update

**Example Error**:
```
PrismaClientKnownRequestError: Check constraint violation
Constraint: check_quantity_positive
```

**Fix**: Ensure `validatePositiveQuantity()` is called before creating OrderItem.

### Issue: User Deletion Fails

**Symptom**: "Cannot delete user with related records"

**Solution**: This is expected behavior for users. The onDelete: SetNull policy should handle this, but if not:
1. Verify migration applied correctly: `npx prisma migrate status`
2. Check foreign key constraints: 
   ```sql
   SELECT * FROM information_schema.table_constraints
   WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'Order';
   ```

### Issue: Performance Degradation

**Symptom**: Queries slower after migration

**Solution**: CHECK constraints have minimal overhead, but if issues persist:
1. Check query execution plans
2. Ensure indexes are optimal
3. Consider adding indexes if needed

---

## Monitoring

### Key Metrics to Watch

1. **Constraint Violation Rate**
   - Monitor application logs for Prisma P2004 errors
   - Should be near zero (indicates bugs if frequent)

2. **Error Types**
   - Check which constraints are violated most
   - Update service layer validation if needed

3. **Performance**
   - Query response times
   - Database CPU usage
   - Should show no significant change

### Logging

Constraint violations are automatically logged by Prisma and caught by our error handler:

```typescript
import { handleConstraintError } from '@/src/lib/database';

try {
  await prisma.orderItem.create({ data });
} catch (error) {
  handleConstraintError(error); // Throws user-friendly error
}
```

### Alerts

Set up alerts for:
- High rate of constraint violations (>10/hour)
- Specific critical constraints: `check_quantity_non_negative`
- Application errors related to constraints

---

## Testing Checklist

After deployment, manually test these critical flows:

### Orders Domain
- [ ] Create new order
- [ ] Add items to order
- [ ] Send order (verify sentAt is set)
- [ ] Try to edit sent order (should fail)
- [ ] Try to add zero quantity item (should fail)

### Receiving Domain
- [ ] Create goods receipt
- [ ] Add receipt lines
- [ ] Confirm receipt (verify receivedAt is set)
- [ ] Try to edit confirmed receipt (should fail)
- [ ] Verify inventory updated correctly

### Inventory Domain
- [ ] Adjust stock (positive and negative)
- [ ] Try to adjust to negative inventory (should fail)
- [ ] Transfer inventory between locations
- [ ] Try to transfer to same location (should fail)
- [ ] Verify audit trail (StockAdjustment records)

### Suppliers
- [ ] Create new supplier
- [ ] Try to create duplicate supplier name (should fail)
- [ ] Delete supplier
- [ ] Verify related orders still exist with null supplierId

### Users
- [ ] Delete user
- [ ] Verify related orders still exist with null createdById
- [ ] Verify audit trail preserved

---

## FAQ

**Q: Will this break existing functionality?**

A: No. The constraints match existing service-layer validation. We're adding defense-in-depth, not changing business logic.

**Q: Can I deploy during business hours?**

A: Yes. Migrations are instant and non-blocking. However, prefer low-traffic periods for first deployment.

**Q: What if I find a data violation?**

A: Review the data, determine if it's legitimate or a data quality issue, then either fix the data or adjust the constraint (rare).

**Q: How do I add new constraints later?**

A: Follow the same pattern:
1. Add CHECK constraint via raw SQL migration
2. Add validation to service layer
3. Update error handler mappings
4. Test thoroughly

**Q: Are these constraints reversible?**

A: Yes. CHECK constraints can be dropped without affecting data. onDelete policies require more care to revert.

---

## Success Criteria

✅ **Migration Successful If**:
- All migrations applied without errors
- No constraint violations in production data
- Application logs show no new errors
- All test scenarios pass
- Key user flows work correctly

✅ **Ready for Magento Integration When**:
- All P1 constraints deployed
- Tests passing
- Monitoring in place
- Team trained on new error messages

---

## Support

For questions or issues:
1. Review this guide thoroughly
2. Check application logs for specific errors
3. Consult DOMAIN_RULES.md for business rule details
4. Run validation queries to identify issues

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Author**: Database Constraint Hardening Initiative

