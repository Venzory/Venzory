# Venzory Documentation

This directory contains technical documentation for the Venzory inventory management system.

## Architecture Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Overall system architecture and design patterns
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - High-level implementation summary
- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - Design tokens, components, and UI patterns reference

## Migration Guides

- **[GLOBAL_SUPPLIER_MIGRATION.md](./GLOBAL_SUPPLIER_MIGRATION.md)** - Phase 1: Global Supplier Architecture migration guide
- **[PHASE_2_SUPPLIER_INTEGRATION.md](./PHASE_2_SUPPLIER_INTEGRATION.md)** - Phase 2: Supplier Integration into Orders and Items
- **[MIGRATION_STATUS.md](./MIGRATION_STATUS.md)** - Current migration status and notes
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - General migration guidelines

## Feature Documentation

- **[RECEIVING_MODULE_IMPLEMENTATION.md](./RECEIVING_MODULE_IMPLEMENTATION.md)** - Goods receiving module
- **[PARTIAL_RECEIVING_FEATURE.md](./PARTIAL_RECEIVING_FEATURE.md)** - Partial receiving functionality
- **[PRODUCT_CATALOG_IMPLEMENTATION.md](../PRODUCT_CATALOG_IMPLEMENTATION.md)** - Product catalog with GS1 integration
- **[NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md](../NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md)** - Notification system

## Phase Reports

- **[PHASE_4_COMPLETION_REPORT.md](./PHASE_4_COMPLETION_REPORT.md)** - Phase 4 completion status
- **[PHASE_5_COMPLETION_REPORT.md](./PHASE_5_COMPLETION_REPORT.md)** - Phase 5 completion status
- **[PHASE_5_FINAL_COMPLETION_REPORT.md](./PHASE_5_FINAL_COMPLETION_REPORT.md)** - Phase 5 final report
- **[SETTINGS_SUPPLIERS_LOCATIONS_REPORT.md](../SETTINGS_SUPPLIERS_LOCATIONS_REPORT.md)** - Settings and suppliers testing
- **[VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md)** - System verification report
- **[HEALTH_CHECK_REPORT.md](./HEALTH_CHECK_REPORT.md)** - System health checks

## Internationalization

- **[i18n-reset-summary.md](./i18n-reset-summary.md)** - i18n implementation notes

## Latest Updates

### November 11, 2025 - Phase 2: Supplier Integration ✨

Phase 2 integrates PracticeSupplier into core business flows (Orders and Items) with full backward compatibility:

**New Features:**
- Orders can use PracticeSupplier or legacy Supplier
- Items support PracticeSupplier as default supplier
- Dual-supplier pattern during transition
- Automatic supplier ID resolution
- Blocked supplier validation
- Practice-specific supplier display (custom labels, account numbers)

**Backend Status**: ✅ 100% Complete and Production Ready

**Quick Start:**
```bash
# Check migration status
npx prisma migrate status

# Create order with PracticeSupplier
# (Programmatically - UI integration pending)
await orderService.createOrder(ctx, {
  practiceSupplierId: 'ps_abc123',
  items: [{ itemId: 'item_1', quantity: 10, unitPrice: 5.99 }]
});

# Create order with legacy Supplier (backward compatible)
await orderService.createOrder(ctx, {
  supplierId: 'supplier_xyz789',
  items: [{ itemId: 'item_1', quantity: 10, unitPrice: 5.99 }]
});
```

**Migration Files:**
- Phase 1: `prisma/migrations/20251111112724_add_global_and_practice_suppliers/migration.sql`
- Phase 2: `prisma/migrations/20251111122948_add_practice_supplier_to_orders_items/migration.sql`

See **[PHASE_2_SUPPLIER_INTEGRATION.md](./PHASE_2_SUPPLIER_INTEGRATION.md)** for complete details.

---

### November 11, 2025 - Phase 1: Global Supplier Architecture ✨

The system now includes a new global supplier architecture alongside the existing practice-scoped model:

**New Features:**
- Platform-wide supplier management via `GlobalSupplier` table
- Practice-specific supplier links via `PracticeSupplier` table
- Data backfill script with dry-run mode
- Admin verification dashboard at `/admin/supplier-migration`
- Full backward compatibility with existing code

**Migration File:**
- `prisma/migrations/20251111112724_add_global_and_practice_suppliers/migration.sql`

See **[GLOBAL_SUPPLIER_MIGRATION.md](./GLOBAL_SUPPLIER_MIGRATION.md)** for complete details.

---

## Local Development Setup

For a fast and consistent development experience, we use a local Postgres instance running in Docker.

### One-time Setup

1. Ensure Docker is running.
2. Run the setup script to provision the `venzory_dev` and `venzory_test` databases:
   ```bash
   npm run db:setup:local
   ```
3. Update your `.env.local` file to point to the local database (see `.env.example`).

### Environment Variables

- **Development/Test**: Use the local Docker Postgres URL (`postgresql://venzory:venzory@localhost:5432/venzory_dev`).
- **Staging/Production**: Use the Neon database URL (configured in Vercel/Neon dashboard).

## Development Commands

```bash
# Database
npm run db:push          # Push schema changes (development)
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio

# Application
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Utilities
npm run backfill:suppliers  # Backfill global supplier data
```

## Contributing

When adding new features or making significant changes:

1. Update relevant documentation in this directory
2. Create migrations for schema changes
3. Add entries to MIGRATION_STATUS.md
4. Update this README with quick links

---

**Last Updated**: November 11, 2025
