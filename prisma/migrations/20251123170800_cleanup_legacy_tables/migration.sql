-- Drop legacy tables that are no longer represented in Prisma schema
-- SupplierCatalog was replaced by SupplierItem in migration 20251122215219

DROP TABLE IF EXISTS "SupplierCatalog";