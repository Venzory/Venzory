-- Formalize Remaining Schema Drift
-- This migration adds the remaining items that exist in schema.prisma
-- but were previously applied via `prisma db push` during development
-- 
-- Items formalized:
-- 1. LocationInventory.createdAt column (audit timestamp)
-- 2. Order composite index on (practiceId, status, createdAt) (performance)
-- 3. LocationInventory index on (itemId, reorderPoint, quantity) (performance)
--
-- These are safe, non-breaking additions that improve auditability and performance.
-- They are idempotent - safe to run even if items already exist.

-- =============================================================================
-- 1. ADD LocationInventory.createdAt COLUMN (if not exists)
-- =============================================================================

-- Check if column exists, add if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'LocationInventory' 
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "LocationInventory" 
        ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added LocationInventory.createdAt column';
    ELSE
        RAISE NOTICE 'LocationInventory.createdAt column already exists, skipping';
    END IF;
END $$;

-- =============================================================================
-- 2. ADD Order COMPOSITE INDEX (practiceId, status, createdAt)
-- =============================================================================

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "Order_practiceId_status_createdAt_idx" 
ON "Order"("practiceId", "status", "createdAt");

-- =============================================================================
-- 3. ADD LocationInventory INDEX (itemId, reorderPoint, quantity)
-- =============================================================================

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "LocationInventory_itemId_reorderPoint_quantity_idx" 
ON "LocationInventory"("itemId", "reorderPoint", "quantity");

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- This migration is idempotent and safe to run multiple times.
-- 
-- If your database already has these items (from `prisma db push`):
-- - The column add will be skipped (via IF NOT EXISTS check)
-- - The indexes will be skipped (via IF NOT EXISTS)
-- - No errors will occur
--
-- If your database doesn't have these items:
-- - They will be added
-- - No data loss
-- - Minimal performance impact during creation
--
-- Performance Impact:
-- - Index creation may take a few seconds on large tables
-- - No blocking for reads
-- - Writes may be slightly delayed during index creation
--
-- =============================================================================

