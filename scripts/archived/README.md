# Archived Migration Scripts

**WARNING: These scripts are dangerous and should only be used as a last resort for emergency database recovery.**

## Scripts in this folder

### clean-migrations-table.ts
- **Purpose**: Drops the entire `_prisma_migrations` table
- **Risk**: HIGH - Causes complete loss of migration history
- **When to use**: NEVER in production. Only for resetting a local dev database from scratch.

### init-migrations-table.ts
- **Purpose**: Initializes a fresh migrations table
- **Risk**: MEDIUM - May cause migration tracking issues if misused
- **When to use**: Only after intentionally dropping the migrations table

### manual-resolve.ts
- **Purpose**: Manually insert migration records into `_prisma_migrations`
- **Risk**: HIGH - Hardcoded for specific migration, can cause checksum mismatches
- **When to use**: NEVER. Use `npx prisma migrate resolve --applied <migration_name>` instead.

## Recommended Alternatives

Instead of using these scripts, use Prisma's built-in commands:

```bash
# Mark a migration as applied (without running it)
npx prisma migrate resolve --applied <migration_name>

# Mark a migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Check migration status
npx prisma migrate status

# Apply pending migrations in production
npx prisma migrate deploy
```

## History

These scripts were archived on 2025-12-04 during a Prisma + Neon health audit.
They were previously used to work around migration tracking issues, which have since
been properly resolved using Prisma's official `migrate resolve` command.

