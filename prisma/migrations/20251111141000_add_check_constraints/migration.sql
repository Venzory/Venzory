-- AddCheckConstraints
-- Database Constraint Hardening - Part 2: CHECK Constraints
-- Generated: 2025-11-11
--
-- IMPORTANT: These constraints enforce business rules at the database level
-- They complement service-layer validation to provide defense-in-depth

-- =============================================================================
-- P1 CRITICAL: NEGATIVE INVENTORY PREVENTION
-- =============================================================================

-- Prevent negative inventory (CRITICAL - would break Magento sync)
ALTER TABLE "LocationInventory" 
ADD CONSTRAINT "check_quantity_non_negative" 
CHECK (quantity >= 0);

-- =============================================================================
-- P1 CRITICAL: POSITIVE QUANTITY ENFORCEMENT
-- =============================================================================

-- Enforce positive quantities in OrderItem
ALTER TABLE "OrderItem" 
ADD CONSTRAINT "check_quantity_positive" 
CHECK (quantity > 0);

-- Enforce positive quantities in GoodsReceiptLine
ALTER TABLE "GoodsReceiptLine" 
ADD CONSTRAINT "check_quantity_positive" 
CHECK (quantity > 0);

-- Enforce positive quantities in InventoryTransfer
ALTER TABLE "InventoryTransfer" 
ADD CONSTRAINT "check_quantity_positive" 
CHECK (quantity > 0);

-- =============================================================================
-- P1: PREVENT SAME-LOCATION TRANSFERS
-- =============================================================================

-- Prevent transferring inventory to the same location
ALTER TABLE "InventoryTransfer" 
ADD CONSTRAINT "check_different_locations" 
CHECK ("fromLocationId" != "toLocationId");

-- =============================================================================
-- P1: PREVENT ZERO ADJUSTMENTS
-- =============================================================================

-- Prevent zero stock adjustments (meaningless adjustments)
ALTER TABLE "StockAdjustment" 
ADD CONSTRAINT "check_quantity_not_zero" 
CHECK (quantity != 0);

-- =============================================================================
-- P1: STATUS-DEPENDENT FIELDS (Order)
-- =============================================================================

-- Ensure SENT orders have sentAt timestamp
ALTER TABLE "Order" 
ADD CONSTRAINT "check_sent_has_sentAt" 
CHECK (status != 'SENT' OR "sentAt" IS NOT NULL);

-- Ensure RECEIVED orders have receivedAt timestamp
ALTER TABLE "Order" 
ADD CONSTRAINT "check_received_has_receivedAt" 
CHECK (status != 'RECEIVED' OR "receivedAt" IS NOT NULL);

-- Ensure PARTIALLY_RECEIVED orders have receivedAt timestamp
ALTER TABLE "Order" 
ADD CONSTRAINT "check_partially_received_has_receivedAt" 
CHECK (status != 'PARTIALLY_RECEIVED' OR "receivedAt" IS NOT NULL);

-- =============================================================================
-- P1: STATUS-DEPENDENT FIELDS (GoodsReceipt)
-- =============================================================================

-- Ensure CONFIRMED receipts have receivedAt timestamp
ALTER TABLE "GoodsReceipt" 
ADD CONSTRAINT "check_confirmed_has_receivedAt" 
CHECK (status != 'CONFIRMED' OR "receivedAt" IS NOT NULL);

-- =============================================================================
-- P2: REORDER SETTINGS VALIDATION
-- =============================================================================

-- Ensure reorderPoint is non-negative if set
ALTER TABLE "LocationInventory" 
ADD CONSTRAINT "check_reorder_point_non_negative" 
CHECK ("reorderPoint" IS NULL OR "reorderPoint" >= 0);

-- Ensure reorderQuantity is positive if set
ALTER TABLE "LocationInventory" 
ADD CONSTRAINT "check_reorder_quantity_positive" 
CHECK ("reorderQuantity" IS NULL OR "reorderQuantity" > 0);

-- =============================================================================
-- P2: PRICE VALIDATION
-- =============================================================================

-- Prevent negative prices in OrderItem
ALTER TABLE "OrderItem" 
ADD CONSTRAINT "check_unitPrice_non_negative" 
CHECK ("unitPrice" IS NULL OR "unitPrice" >= 0);

-- Prevent negative prices in SupplierItem
ALTER TABLE "SupplierItem" 
ADD CONSTRAINT "check_unitPrice_non_negative" 
CHECK ("unitPrice" IS NULL OR "unitPrice" >= 0);

-- Prevent negative prices in SupplierCatalog
ALTER TABLE "SupplierCatalog" 
ADD CONSTRAINT "check_unitPrice_non_negative" 
CHECK ("unitPrice" IS NULL OR "unitPrice" >= 0);

-- =============================================================================
-- P2: MIN ORDER QUANTITY VALIDATION
-- =============================================================================

-- Ensure minOrderQty is positive in SupplierItem
ALTER TABLE "SupplierItem" 
ADD CONSTRAINT "check_minOrderQty_positive" 
CHECK ("minOrderQty" IS NULL OR "minOrderQty" > 0);

-- Ensure minOrderQty is positive in SupplierCatalog
ALTER TABLE "SupplierCatalog" 
ADD CONSTRAINT "check_minOrderQty_positive" 
CHECK ("minOrderQty" IS NULL OR "minOrderQty" > 0);

-- =============================================================================
-- CONSTRAINT SUMMARY
-- =============================================================================
--
-- P1 Critical Constraints (Magento Blockers):
-- - LocationInventory.quantity >= 0           (Prevents negative inventory)
-- - OrderItem.quantity > 0                    (Valid order quantities)
-- - GoodsReceiptLine.quantity > 0             (Valid receipt quantities)
-- - InventoryTransfer.quantity > 0            (Valid transfer quantities)
-- - InventoryTransfer: fromLocation != toLocation (Meaningful transfers only)
-- - StockAdjustment.quantity != 0             (No meaningless adjustments)
-- - Order: status-dependent timestamps        (Data consistency)
-- - GoodsReceipt: status-dependent timestamps (Data consistency)
--
-- P2 Data Integrity Constraints:
-- - LocationInventory: reorderPoint >= 0      (Valid reorder settings)
-- - LocationInventory: reorderQuantity > 0    (Valid reorder settings)
-- - Prices >= 0 across all models             (No negative prices)
-- - minOrderQty > 0 where applicable          (Valid minimum quantities)
--
-- These constraints provide a safety net at the database level, complementing
-- the existing service-layer validation. They prevent data corruption even if
-- direct database access occurs or if there are bugs in the application logic.
--
-- Performance Impact: CHECK constraints have minimal overhead (microseconds)
-- and are evaluated only during INSERT and UPDATE operations.
--
-- =============================================================================

