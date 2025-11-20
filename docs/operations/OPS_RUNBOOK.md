# Operations Runbook - Venzory

**Last Updated**: November 16, 2025  
**Audience**: DevOps, SRE, Backend Engineers

---

## Table of Contents

1. [Local DB Verification](#local-db-verification)
2. [Staging/Prod DB Verification Checklist](#stagingprod-db-verification-checklist)
3. [Database Migration Procedures](#database-migration-procedures)
4. [Drift Detection & Remediation](#drift-detection--remediation)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)

---

## Local DB Verification

### Prerequisites

- Docker Compose running with local PostgreSQL
- `.env` file configured with `DATABASE_URL` pointing to local dev DB
- Node.js and dependencies installed (`npm install`)

### Reset & Migrate Local Dev DB

#### Option 1: Clean Reset (Drops & Recreates Schema)

```bash
# Ensure you're pointing at local dev DB
cat .env | grep DATABASE_URL

# Reset database (applies all migrations from scratch)
npx prisma migrate reset --force --skip-seed

# Expected output:
# - "Database reset successful"
# - All migrations applied in order
# - Schema up to date
```

**When to use**: 
- Starting fresh
- After pulling major schema changes
- Troubleshooting migration issues

#### Option 2: Incremental Update (No Destructive Reset)

```bash
# Apply any pending migrations
npm run db:migrate
# OR
npx prisma migrate dev

# Expected output:
# - "Database schema is up to date" (if no pending migrations)
# - OR list of applied migrations
```

**When to use**:
- Normal development workflow
- Applying new migrations
- Preserving local test data

### Run Verification Scripts

#### 1. Check Migration Status

```bash
npx prisma migrate status

# Expected output (healthy):
# - "Database schema is up to date"
# - List of applied migrations
# - "Drift detected: None" (or documented drift items)
```

#### 2. Validate Data Integrity

```bash
# Run constraint violation checks
npm run db:validate
# OR
npx tsx scripts/run-validation-queries.ts

# Expected output (healthy):
# ✅ No constraint violations found! Database is ready for migration.
# Total violations found: 0

# If violations found:
# - Review the detailed output
# - Fix data issues before proceeding
```

**What it checks**:
- Negative inventory
- Invalid quantities (zero/negative)
- Orphaned references
- Status-timestamp consistency
- Same-location transfers
- Negative prices

#### 3. Check for Duplicate Data

```bash
# Run duplicate detection
npm run db:check-duplicates
# OR
npx tsx scripts/check-duplicates.ts

# Expected output (healthy):
# ✅ No duplicate Item names found
# ✅ No duplicate Item SKUs found
# ✅ No duplicate Location codes found

# If duplicates found:
# - Review the SQL queries provided in output
# - Decide whether to merge, rename, or delete
# - Re-run after fixes
```

**What it checks**:
- `Item(practiceId, name)` duplicates
- `Item(practiceId, sku)` duplicates (where sku IS NOT NULL)
- `Location(practiceId, code)` duplicates (where code IS NOT NULL)

#### 4. Verify Constraints Are Present

```bash
# Verify unique constraints exist in DB
npm run db:verify-constraints
# OR
npx tsx scripts/verify-constraints.ts

# Expected output (healthy):
# ✅ All expected unique constraints are present!
# - Item_practiceId_name_key
# - Item_practiceId_sku_key
# - Location_practiceId_code_key
# - PracticeUser_practiceId_userId_key
```

### Quick Health Check

Run all verification steps in sequence:

```bash
# Full verification suite (using npm scripts)
npm run db:verify-all

# OR manually
npx prisma migrate status && \
npx tsx scripts/run-validation-queries.ts && \
npx tsx scripts/check-duplicates.ts && \
npx tsx scripts/verify-constraints.ts

# All should pass with ✅ indicators
```

---

## Staging/Prod DB Verification Checklist

> **⚠️ CRITICAL PRINCIPLES**:
> - **NEVER** run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` against staging/production
> - **ONLY** use `prisma migrate deploy`, `prisma migrate status`, and read-only scripts
> - **ALWAYS** backup production before applying schema changes
> - **ALWAYS** test on staging first, then production

### Pre-Migration Checklist

#### Step 1: Set Database URL

```bash
# For staging (PowerShell)
$env:DATABASE_URL = "<staging-connection-string>"

# For staging (bash/zsh)
export DATABASE_URL="<staging-connection-string>"

# Verify it's set correctly
echo $DATABASE_URL  # bash
echo $env:DATABASE_URL  # PowerShell
```

**⚠️ Double-check**: Ensure you're pointing at the correct environment!

#### Step 2: Verify Connectivity & Migration History

```bash
# Check current migration status (READ-ONLY)
npx prisma migrate status

# Look for:
# - List of applied migrations
# - "Database schema is up to date" OR "Pending migrations: X"
# - "Drift detected" status
```

**What to check**:
- Are constraint hardening migrations applied?
  - `20251111140000_add_ondelete_policies_and_constraints`
  - `20251111141000_add_check_constraints`
  - `20251113180000_add_unique_constraints_items_locations`
- Are there pending migrations?
- Is there unexpected drift?

#### Step 3: Create Backup (REQUIRED for Production)

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has content
ls -lh backup_before_migration_*.sql
```

**⚠️ CRITICAL**: Do not proceed without a verified backup for production!

#### Step 4: Run Data Validation (READ-ONLY)

```bash
# Check for constraint violations
npm run db:validate

# ✅ If output shows "Total violations found: 0" → SAFE to proceed
# ❌ If violations found → STOP and fix data first
```

#### Step 5: Check for Duplicate Data (READ-ONLY)

```bash
# Check for duplicates that would violate unique constraints
npm run db:check-duplicates

# ✅ If exit code 0 and no duplicates → SAFE to proceed
# ❌ If duplicates found → STOP and resolve duplicates first
```

### Migration Application Checklist

#### Step 6: Apply Migrations (SCHEMA-CHANGING)

```bash
# Apply pending migrations
npx prisma migrate deploy

# What happens:
# - Applies migrations in order from prisma/migrations/
# - Does NOT drop tables/columns (unless explicitly in migration)
# - Exits with error if constraint violation occurs

# Expected output:
# - "Applying migration `<name>`" for each pending migration
# - "The following migration(s) have been applied: ..."
# - Exit code 0
```

**If migration fails**:
1. Note the specific constraint/error from output
2. Use validation queries to identify offending rows
3. Fix data issues
4. Re-run `prisma migrate deploy`

#### Step 7: Post-Migration Verification

```bash
# Verify migrations applied successfully
npx prisma migrate status
# Expected: "Database schema is up to date"

# Re-run all verification checks
npm run db:verify-all
# Expected: All checks pass with ✅

# OR run individually:
npm run db:validate          # Expected: 0 violations
npm run db:check-duplicates  # Expected: No duplicates
npm run db:verify-constraints # Expected: All constraints present
```

#### Step 8: Smoke Test Key Flows

Manually test critical user flows:

- [ ] Create a draft order
- [ ] Add items to order
- [ ] Send order (verify sentAt is set)
- [ ] Create goods receipt
- [ ] Confirm receipt (verify inventory updated)
- [ ] Adjust stock (verify can't go negative)
- [ ] Transfer inventory between locations

#### Step 9: Monitor Application Logs (Production Only)

```bash
# Monitor for constraint violations or FK errors
# Watch Sentry, CloudWatch, or your logging platform

# Look for:
# - Prisma error code P2004 (CHECK constraint violation)
# - Foreign key constraint violations
# - Any unexpected database errors

# Monitor for at least 10-15 minutes after deployment
```

### Complete Checklist (Copy-Paste Format)

```markdown
## Staging/Prod DB Migration Checklist

**Environment**: [ ] Staging  [ ] Production
**Date**: _____________
**Engineer**: _____________

### Pre-Migration
- [ ] Set `DATABASE_URL` for target environment
- [ ] Run `npx prisma migrate status` (review output)
- [ ] Create DB backup via `pg_dump` (REQUIRED for prod)
- [ ] Run `npm run db:validate` (0 violations required)
- [ ] Run `npm run db:check-duplicates` (no duplicates required)

### Migration
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify no errors in output
- [ ] Re-run `npx prisma migrate status` (should be up to date)

### Post-Migration
- [ ] Run `npm run db:verify-all` (all checks pass)
- [ ] Smoke-test: Create order
- [ ] Smoke-test: Receive goods
- [ ] Smoke-test: Adjust inventory
- [ ] (Prod only) Monitor logs for 10-15 minutes

### Sign-off
- [ ] All checks passed
- [ ] No errors in application logs
- [ ] Ready for next environment / production traffic

**Notes**:
_____________________________________________
```

---

## Database Migration Procedures

### Safe Commands (Allowed on Staging/Prod)

✅ **Read-only introspection**:
```bash
npx prisma migrate status
npx prisma db pull  # (for drift analysis only)
```

✅ **Migration deployment**:
```bash
npx prisma migrate deploy
```

✅ **Verification scripts** (SELECT-only):
```bash
npm run db:validate           # Check constraint violations
npm run db:check-duplicates   # Check for duplicate data
npm run db:verify-constraints # Verify constraints exist
npm run db:verify-all         # Run all checks in sequence
```

### Dangerous Commands (NEVER on Staging/Prod)

❌ **Development-only commands**:
```bash
# NEVER run these on staging/prod:
npx prisma migrate dev
npm run db:migrate
npx prisma migrate reset
npx prisma db push
npx prisma db push --accept-data-loss
```

❌ **Unreviewed DDL**:
- Manual `ALTER TABLE` / `DROP COLUMN` / `DROP TABLE`
- Direct SQL schema changes without migration files
- Any command that modifies schema without proper review

### Emergency Procedures

If you accidentally run a dangerous command on staging/prod:

1. **STOP immediately** - don't run any more commands
2. **Assess damage** - check what changed via `prisma db pull`
3. **Notify team** - alert senior engineers immediately
4. **Restore from backup** if data loss occurred
5. **Document incident** - write post-mortem

---

## Drift Detection & Remediation

### Detecting Drift

#### Method 1: Prisma Migrate Status

```bash
npx prisma migrate status

# If drift detected:
# - "Drift detected: <details>"
# - Lists differences between DB and schema.prisma
```

#### Method 2: Migrate Diff (Detailed Analysis)

```bash
# Generate SQL showing differences
npx prisma migrate diff \
  --from-url="$DATABASE_URL" \
  --to-schema-datasource \
  --script > drift-analysis.sql

# Review drift-analysis.sql to see exact differences
cat drift-analysis.sql
```

### Known Drift Items (As of Nov 2025)

The following items exist in `schema.prisma` but are not backed by migrations:

1. **LocationInventory.createdAt** - audit timestamp
2. **Order composite index** on `(practiceId, status, createdAt)`
3. **LocationInventory index** on `[itemId, reorderPoint, quantity]`

**Impact**: Low (performance optimizations and audit timestamp)

**Status**: Documented in `docs/MIGRATION_STATUS.md` - no immediate action required

### Remediation for Staging Behind Dev

If staging is missing migrations that exist in the repo:

1. **Validate data** using verification scripts
2. **Apply migrations** via `prisma migrate deploy`
3. **Verify** using post-migration checks
4. **Document** any issues encountered

### Remediation for Prod Missing Constraints

If production is missing constraints defined in `schema.prisma`:

1. **Test on staging first** - apply migrations there
2. **Resolve all issues** on staging before touching prod
3. **Create backup** of production database
4. **Apply migrations** during low-traffic period
5. **Monitor closely** for 15-30 minutes post-deployment

---

## Rollback Procedures

### Rollback CHECK Constraints (Safe)

If a CHECK constraint is causing issues, it can be dropped without affecting data:

```sql
-- Example: Remove quantity constraint
ALTER TABLE "LocationInventory" 
DROP CONSTRAINT IF EXISTS "check_quantity_non_negative";

-- This is safe - no data is lost
-- Application will continue to work (service-layer validation still active)
```

### Rollback Unique Constraints (Moderate Risk)

Dropping unique constraints is safe but may allow duplicate data:

```sql
-- Example: Remove item name unique constraint
DROP INDEX IF EXISTS "Item_practiceId_name_key";

-- Risk: Duplicates may be created after removal
-- Recommendation: Only do this temporarily while fixing data
```

### Rollback onDelete Policies (Complex)

Reverting onDelete policies requires:
1. Dropping and recreating foreign keys
2. Potentially restoring from backup
3. Re-generating Prisma client
4. Re-deploying application

**Recommendation**: Avoid rolling back onDelete policies - they're generally safe and beneficial.

### Full Database Restore

If major issues occur:

```bash
# Restore from backup
psql $DATABASE_URL < backup_before_migration_YYYYMMDD_HHMMSS.sql

# Verify restore
npx prisma migrate status

# Re-generate Prisma client
npx prisma generate

# Re-deploy application
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Constraint Violation Rate**
   - Prisma error code: `P2004`
   - Should be near zero (indicates bugs if frequent)

2. **Foreign Key Violations**
   - Prisma error code: `P2003`
   - May indicate data integrity issues

3. **Query Performance**
   - Monitor slow query logs
   - Check if new constraints impact performance (rare)

### Recommended Alerts

Set up alerts for:

- **High constraint violation rate**: >10 violations/hour
- **Critical constraint violations**: `check_quantity_non_negative`
- **Database errors**: Any Prisma P2xxx errors
- **Migration failures**: Failed `prisma migrate deploy` in CI/CD

### Log Monitoring

Constraint violations are logged by Prisma:

```typescript
// Example log entry
{
  "error": "PrismaClientKnownRequestError",
  "code": "P2004",
  "message": "Check constraint violation: check_quantity_non_negative",
  "meta": {
    "constraint": "check_quantity_non_negative"
  }
}
```

Use your logging platform (Sentry, CloudWatch, etc.) to:
- Filter for P2004 errors
- Group by constraint name
- Alert on threshold exceeded

---

## Additional Resources

- **Migration Guide**: `docs/migrations/database-constraint-hardening.md`
- **Domain Rules**: `DOMAIN_RULES.md`
- **Migration Status**: `docs/MIGRATION_STATUS.md`
- **Architecture**: `docs/ARCHITECTURE.md`

---

**Document Version**: 1.0  
**Last Reviewed**: November 16, 2025  
**Next Review**: After next major migration

