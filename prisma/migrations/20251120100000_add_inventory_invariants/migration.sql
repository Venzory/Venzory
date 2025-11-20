-- Sanitize LocationInventory
-- Reset negative quantities to 0
UPDATE "LocationInventory" SET quantity = 0 WHERE quantity < 0;

-- Fix invalid reorder parameters if they exist
UPDATE "LocationInventory" SET "reorderPoint" = 0 WHERE "reorderPoint" < 0;
UPDATE "LocationInventory" SET "reorderQuantity" = 1 WHERE "reorderQuantity" <= 0;
UPDATE "LocationInventory" SET "maxStock" = 1 WHERE "maxStock" <= 0;

-- Sanitize StockAdjustment
-- Remove meaningless adjustments with 0 quantity
DELETE FROM "StockAdjustment" WHERE quantity = 0;

-- Sanitize OrderTemplateItem
-- Ensure default quantity is at least 1
UPDATE "OrderTemplateItem" SET "defaultQuantity" = 1 WHERE "defaultQuantity" <= 0;

-- Sanitize InventoryTransfer
-- Remove invalid transfers with 0 or negative quantity
DELETE FROM "InventoryTransfer" WHERE quantity <= 0;

-- Sanitize GoodsReceiptLine
-- Remove invalid receipt lines with 0 or negative quantity
DELETE FROM "GoodsReceiptLine" WHERE quantity <= 0;

-- Add Constraints

-- LocationInventory: quantity must be non-negative
ALTER TABLE "LocationInventory" ADD CONSTRAINT "LocationInventory_quantity_check" CHECK (quantity >= 0);

-- LocationInventory: reorderPoint must be non-negative (if set)
ALTER TABLE "LocationInventory" ADD CONSTRAINT "LocationInventory_reorderPoint_check" CHECK ("reorderPoint" >= 0);

-- LocationInventory: reorderQuantity must be positive (if set)
ALTER TABLE "LocationInventory" ADD CONSTRAINT "LocationInventory_reorderQuantity_check" CHECK ("reorderQuantity" > 0);

-- LocationInventory: maxStock must be positive (if set)
ALTER TABLE "LocationInventory" ADD CONSTRAINT "LocationInventory_maxStock_check" CHECK ("maxStock" > 0);

-- StockAdjustment: quantity cannot be zero (but can be negative)
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_quantity_check" CHECK (quantity != 0);

-- OrderTemplateItem: defaultQuantity must be positive
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_defaultQuantity_check" CHECK ("defaultQuantity" > 0);

-- InventoryTransfer: quantity must be positive
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_quantity_check" CHECK (quantity > 0);

-- GoodsReceiptLine: quantity must be positive
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_quantity_check" CHECK (quantity > 0);

