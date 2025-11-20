-- Restore missing partial unique indexes
-- These were originally present but lost during migration consolidation
-- Generated: 2025-11-19

-- Create partial unique index on Item(practiceId, sku) where sku is not null
CREATE UNIQUE INDEX IF NOT EXISTS "Item_practiceId_sku_key" ON "Item"("practiceId", "sku") WHERE "sku" IS NOT NULL;

-- Create partial unique index on Location(practiceId, code) where code is not null
CREATE UNIQUE INDEX IF NOT EXISTS "Location_practiceId_code_key" ON "Location"("practiceId", "code") WHERE "code" IS NOT NULL;

