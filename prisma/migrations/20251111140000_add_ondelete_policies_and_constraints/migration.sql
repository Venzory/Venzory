-- AddOnDeletePoliciesAndConstraints
-- Database Constraint Hardening - Part 1: Foreign Key Policies and Unique Constraints
-- Generated: 2025-11-11

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- Add unique constraint on GlobalSupplier.name
ALTER TABLE "GlobalSupplier" ADD CONSTRAINT "GlobalSupplier_name_key" UNIQUE ("name");

-- Add unique constraint on Supplier (practiceId, name) to prevent duplicate names within a practice
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_practiceId_name_key" UNIQUE ("practiceId", "name");

-- =============================================================================
-- FOREIGN KEY POLICY UPDATES: User References (SetNull to preserve audit trail)
-- =============================================================================

-- Make createdById nullable where needed
ALTER TABLE "Order" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "GoodsReceipt" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "StockAdjustment" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "InventoryTransfer" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "StockCountSession" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "OrderTemplate" ALTER COLUMN "createdById" DROP NOT NULL;

-- Drop existing User foreign keys without onDelete policies
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_createdById_fkey";
ALTER TABLE "GoodsReceipt" DROP CONSTRAINT IF EXISTS "GoodsReceipt_createdById_fkey";
ALTER TABLE "StockAdjustment" DROP CONSTRAINT IF EXISTS "StockAdjustment_createdById_fkey";
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT IF EXISTS "InventoryTransfer_createdById_fkey";
ALTER TABLE "StockCountSession" DROP CONSTRAINT IF EXISTS "StockCountSession_createdById_fkey";
ALTER TABLE "OrderTemplate" DROP CONSTRAINT IF EXISTS "OrderTemplate_createdById_fkey";

-- Re-add User foreign keys with onDelete: SetNull
ALTER TABLE "Order" 
  ADD CONSTRAINT "Order_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GoodsReceipt" 
  ADD CONSTRAINT "GoodsReceipt_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockAdjustment" 
  ADD CONSTRAINT "StockAdjustment_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer" 
  ADD CONSTRAINT "InventoryTransfer_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockCountSession" 
  ADD CONSTRAINT "StockCountSession_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderTemplate" 
  ADD CONSTRAINT "OrderTemplate_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- FOREIGN KEY POLICY UPDATES: Supplier References (SetNull to preserve history)
-- =============================================================================

-- Make supplierId nullable in Order
ALTER TABLE "Order" ALTER COLUMN "supplierId" DROP NOT NULL;

-- Drop existing Supplier foreign keys without onDelete policies
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_supplierId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_practiceSupplierId_fkey";
ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_defaultSupplierId_fkey";
ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_defaultPracticeSupplierId_fkey";
ALTER TABLE "SupplierItem" DROP CONSTRAINT IF EXISTS "SupplierItem_practiceSupplierId_fkey";

-- Re-add Supplier foreign keys with onDelete: SetNull
ALTER TABLE "Order" 
  ADD CONSTRAINT "Order_supplierId_fkey" 
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" 
  ADD CONSTRAINT "Order_practiceSupplierId_fkey" 
  FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Item" 
  ADD CONSTRAINT "Item_defaultSupplierId_fkey" 
  FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Item" 
  ADD CONSTRAINT "Item_defaultPracticeSupplierId_fkey" 
  FOREIGN KEY ("defaultPracticeSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierItem" 
  ADD CONSTRAINT "SupplierItem_practiceSupplierId_fkey" 
  FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- FOREIGN KEY POLICY UPDATES: Location References (Restrict to preserve audit)
-- =============================================================================

-- Drop existing Location foreign keys in InventoryTransfer
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT IF EXISTS "InventoryTransfer_fromLocationId_fkey";
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT IF EXISTS "InventoryTransfer_toLocationId_fkey";

-- Re-add Location foreign keys with onDelete: Restrict
ALTER TABLE "InventoryTransfer" 
  ADD CONSTRAINT "InventoryTransfer_fromLocationId_fkey" 
  FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer" 
  ADD CONSTRAINT "InventoryTransfer_toLocationId_fkey" 
  FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- NEW FOREIGN KEY: PracticeSupplier Migration Tracking
-- =============================================================================

-- Add foreign key for PracticeSupplier.migratedFromSupplierId with onDelete: SetNull
ALTER TABLE "PracticeSupplier" 
  ADD CONSTRAINT "PracticeSupplier_migratedFromSupplierId_fkey" 
  FOREIGN KEY ("migratedFromSupplierId") REFERENCES "Supplier"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- This migration adds:
-- 1. onDelete policies to all User references (SetNull to preserve audit trail)
-- 2. onDelete policies to all Supplier references (SetNull to preserve order history)
-- 3. onDelete: Restrict for Location references in transfers (preserve audit trail)
-- 4. FK constraint for PracticeSupplier.migratedFromSupplierId (Phase 2 migration tracking)
-- 5. Unique constraints on GlobalSupplier.name and Supplier(practiceId, name)
--
-- These changes ensure referential integrity while preserving historical records.
--
-- CHECK constraints for quantities, prices, and status-dependent fields will be
-- added in a separate migration (add_check_constraints).
--
-- =============================================================================

