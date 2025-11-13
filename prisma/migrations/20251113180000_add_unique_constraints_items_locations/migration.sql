-- Add Unique Constraints for Items and Locations
-- P1: Missing Unique Constraints (Production Readiness)
-- Generated: 2025-11-13
--
-- Enforces:
-- 1. Item: practiceId + name (all rows)
-- 2. Item: practiceId + sku (where sku IS NOT NULL)
-- 3. Location: practiceId + code (where code IS NOT NULL)

-- =============================================================================
-- ITEM: practiceId + name UNIQUE CONSTRAINT
-- =============================================================================

-- Enforce unique item names per practice
-- This prevents duplicate item names within the same practice
CREATE UNIQUE INDEX "Item_practiceId_name_key" ON "Item"("practiceId", "name");

-- =============================================================================
-- ITEM: practiceId + sku PARTIAL UNIQUE INDEX
-- =============================================================================

-- Enforce unique SKUs per practice (where SKU is not null)
-- Partial index allows multiple NULL SKUs
CREATE UNIQUE INDEX "Item_practiceId_sku_key" ON "Item"("practiceId", "sku") WHERE "sku" IS NOT NULL;

-- =============================================================================
-- LOCATION: practiceId + code PARTIAL UNIQUE INDEX
-- =============================================================================

-- Enforce unique location codes per practice (where code is not null)
-- Partial index allows multiple NULL codes
CREATE UNIQUE INDEX "Location_practiceId_code_key" ON "Location"("practiceId", "code") WHERE "code" IS NOT NULL;

