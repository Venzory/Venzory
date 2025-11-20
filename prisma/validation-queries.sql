-- Pre-Migration Data Validation Queries
-- Run these queries to identify existing data that would violate new constraints
-- Database Constraint Hardening - Venzory
-- Generated: 2025-11-11

-- =============================================================================
-- CRITICAL P1: NEGATIVE INVENTORY
-- =============================================================================

-- Find negative inventory quantities (CRITICAL - would break Magento sync)
SELECT 
    'Negative Inventory' as issue_type,
    li."locationId",
    li."itemId",
    li.quantity,
    i.name as item_name,
    l.name as location_name
FROM "LocationInventory" li
JOIN "Item" i ON i.id = li."itemId"
JOIN "Location" l ON l.id = li."locationId"
WHERE li.quantity < 0
ORDER BY li.quantity ASC;

-- =============================================================================
-- P1: INVALID QUANTITIES
-- =============================================================================

-- Find OrderItems with zero or negative quantities
SELECT 
    'OrderItem Zero/Negative Quantity' as issue_type,
    oi.id,
    oi."orderId",
    oi."itemId",
    oi.quantity,
    o.status as order_status
FROM "OrderItem" oi
JOIN "Order" o ON o.id = oi."orderId"
WHERE oi.quantity <= 0
ORDER BY oi.quantity ASC;

-- Find GoodsReceiptLines with zero or negative quantities
SELECT 
    'GoodsReceiptLine Zero/Negative Quantity' as issue_type,
    grl.id,
    grl."receiptId",
    grl."itemId",
    grl.quantity,
    gr.status as receipt_status
FROM "GoodsReceiptLine" grl
JOIN "GoodsReceipt" gr ON gr.id = grl."receiptId"
WHERE grl.quantity <= 0
ORDER BY grl.quantity ASC;

-- Find InventoryTransfers with zero or negative quantities
SELECT 
    'InventoryTransfer Zero/Negative Quantity' as issue_type,
    it.id,
    it."itemId",
    it."fromLocationId",
    it."toLocationId",
    it.quantity
FROM "InventoryTransfer" it
WHERE it.quantity <= 0
ORDER BY it.quantity ASC;

-- Find StockAdjustments with zero quantity
SELECT 
    'StockAdjustment Zero Quantity' as issue_type,
    sa.id,
    sa."itemId",
    sa."locationId",
    sa.quantity,
    sa.reason
FROM "StockAdjustment" sa
WHERE sa.quantity = 0
ORDER BY sa."createdAt" DESC;

-- =============================================================================
-- P1: SAME-LOCATION TRANSFERS
-- =============================================================================

-- Find InventoryTransfers where from and to locations are the same
SELECT 
    'Same Location Transfer' as issue_type,
    it.id,
    it."itemId",
    it."fromLocationId",
    it."toLocationId",
    it.quantity,
    l.name as location_name
FROM "InventoryTransfer" it
JOIN "Location" l ON l.id = it."fromLocationId"
WHERE it."fromLocationId" = it."toLocationId"
ORDER BY it."createdAt" DESC;

-- =============================================================================
-- P1: STATUS-DEPENDENT FIELDS
-- =============================================================================

-- Find SENT orders without sentAt timestamp
SELECT 
    'SENT Order Without sentAt' as issue_type,
    o.id,
    o."practiceId",
    o.status,
    o."sentAt",
    o."createdAt"
FROM "Order" o
WHERE o.status = 'SENT' AND o."sentAt" IS NULL
ORDER BY o."createdAt" DESC;

-- Find RECEIVED orders without receivedAt timestamp
SELECT 
    'RECEIVED Order Without receivedAt' as issue_type,
    o.id,
    o."practiceId",
    o.status,
    o."receivedAt",
    o."createdAt"
FROM "Order" o
WHERE o.status = 'RECEIVED' AND o."receivedAt" IS NULL
ORDER BY o."createdAt" DESC;

-- Find CONFIRMED receipts without receivedAt timestamp
SELECT 
    'CONFIRMED Receipt Without receivedAt' as issue_type,
    gr.id,
    gr."practiceId",
    gr.status,
    gr."receivedAt",
    gr."createdAt"
FROM "GoodsReceipt" gr
WHERE gr.status = 'CONFIRMED' AND gr."receivedAt" IS NULL
ORDER BY gr."createdAt" DESC;

-- =============================================================================
-- P1: NEGATIVE PRICES
-- =============================================================================

-- Find OrderItems with negative prices
SELECT 
    'OrderItem Negative Price' as issue_type,
    oi.id,
    oi."orderId",
    oi."itemId",
    oi."unitPrice"
FROM "OrderItem" oi
WHERE oi."unitPrice" IS NOT NULL AND oi."unitPrice" < 0
ORDER BY oi."unitPrice" ASC;

-- Find SupplierItems with negative prices
SELECT 
    'SupplierItem Negative Price' as issue_type,
    si.id,
    si."supplierId",
    si."itemId",
    si."unitPrice"
FROM "SupplierItem" si
WHERE si."unitPrice" IS NOT NULL AND si."unitPrice" < 0
ORDER BY si."unitPrice" ASC;

-- Find SupplierCatalog with negative prices
SELECT 
    'SupplierCatalog Negative Price' as issue_type,
    sc.id,
    sc."supplierId",
    sc."productId",
    sc."unitPrice"
FROM "SupplierCatalog" sc
WHERE sc."unitPrice" IS NOT NULL AND sc."unitPrice" < 0
ORDER BY sc."unitPrice" ASC;

-- =============================================================================
-- P2: INVALID REORDER SETTINGS
-- =============================================================================

-- Find LocationInventory with negative reorderPoint
SELECT 
    'Negative Reorder Point' as issue_type,
    li."locationId",
    li."itemId",
    li."reorderPoint",
    l.name as location_name,
    i.name as item_name
FROM "LocationInventory" li
JOIN "Location" l ON l.id = li."locationId"
JOIN "Item" i ON i.id = li."itemId"
WHERE li."reorderPoint" IS NOT NULL AND li."reorderPoint" < 0
ORDER BY li."reorderPoint" ASC;

-- Find LocationInventory with zero or negative reorderQuantity
SELECT 
    'Invalid Reorder Quantity' as issue_type,
    li."locationId",
    li."itemId",
    li."reorderQuantity",
    l.name as location_name,
    i.name as item_name
FROM "LocationInventory" li
JOIN "Location" l ON l.id = li."locationId"
JOIN "Item" i ON i.id = li."itemId"
WHERE li."reorderQuantity" IS NOT NULL AND li."reorderQuantity" <= 0
ORDER BY li."reorderQuantity" ASC;

-- =============================================================================
-- P2: INVALID MIN ORDER QUANTITIES
-- =============================================================================

-- Find SupplierItems with invalid minOrderQty
SELECT 
    'SupplierItem Invalid MinOrderQty' as issue_type,
    si.id,
    si."supplierId",
    si."itemId",
    si."minOrderQty"
FROM "SupplierItem" si
WHERE si."minOrderQty" IS NOT NULL AND si."minOrderQty" <= 0
ORDER BY si."minOrderQty" ASC;

-- Find SupplierCatalog with invalid minOrderQty
SELECT 
    'SupplierCatalog Invalid MinOrderQty' as issue_type,
    sc.id,
    sc."supplierId",
    sc."productId",
    sc."minOrderQty"
FROM "SupplierCatalog" sc
WHERE sc."minOrderQty" IS NOT NULL AND sc."minOrderQty" <= 0
ORDER BY sc."minOrderQty" ASC;

-- =============================================================================
-- P2: ORPHANED REFERENCES (will be handled by onDelete policies)
-- =============================================================================

-- Find Orders with non-existent creator
SELECT 
    'Order Orphaned Creator' as issue_type,
    o.id,
    o."createdById",
    o."practiceId"
FROM "Order" o
LEFT JOIN "User" u ON u.id = o."createdById"
WHERE u.id IS NULL
ORDER BY o."createdAt" DESC;

-- Find Orders with non-existent supplier
SELECT 
    'Order Orphaned Supplier' as issue_type,
    o.id,
    o."supplierId",
    o."practiceId"
FROM "Order" o
LEFT JOIN "Supplier" s ON s.id = o."supplierId"
WHERE s.id IS NULL
ORDER BY o."createdAt" DESC;

-- Find GoodsReceipts with non-existent creator
SELECT 
    'GoodsReceipt Orphaned Creator' as issue_type,
    gr.id,
    gr."createdById",
    gr."practiceId"
FROM "GoodsReceipt" gr
LEFT JOIN "User" u ON u.id = gr."createdById"
WHERE u.id IS NULL
ORDER BY gr."createdAt" DESC;

-- Find StockAdjustments with non-existent creator
SELECT 
    'StockAdjustment Orphaned Creator' as issue_type,
    sa.id,
    sa."createdById",
    sa."practiceId"
FROM "StockAdjustment" sa
LEFT JOIN "User" u ON u.id = sa."createdById"
WHERE u.id IS NULL
ORDER BY sa."createdAt" DESC;

-- Find InventoryTransfers with non-existent creator
SELECT 
    'InventoryTransfer Orphaned Creator' as issue_type,
    it.id,
    it."createdById",
    it."practiceId"
FROM "InventoryTransfer" it
LEFT JOIN "User" u ON u.id = it."createdById"
WHERE u.id IS NULL
ORDER BY it."createdAt" DESC;

-- Find StockCountSessions with non-existent creator
SELECT 
    'StockCountSession Orphaned Creator' as issue_type,
    scs.id,
    scs."createdById",
    scs."practiceId"
FROM "StockCountSession" scs
LEFT JOIN "User" u ON u.id = scs."createdById"
WHERE u.id IS NULL
ORDER BY scs."createdAt" DESC;

-- Find OrderTemplates with non-existent creator
SELECT 
    'OrderTemplate Orphaned Creator' as issue_type,
    ot.id,
    ot."createdById",
    ot."practiceId"
FROM "OrderTemplate" ot
LEFT JOIN "User" u ON u.id = ot."createdById"
WHERE u.id IS NULL
ORDER BY ot."createdAt" DESC;

-- Find Items with non-existent default supplier
SELECT 
    'Item Orphaned Default Supplier' as issue_type,
    i.id,
    i."defaultSupplierId",
    i."practiceId"
FROM "Item" i
LEFT JOIN "Supplier" s ON s.id = i."defaultSupplierId"
WHERE i."defaultSupplierId" IS NOT NULL AND s.id IS NULL
ORDER BY i."createdAt" DESC;

-- =============================================================================
-- P3: DUPLICATE SUPPLIER NAMES (will add unique constraint)
-- =============================================================================

-- Find duplicate Supplier names within same Practice
SELECT 
    'Duplicate Supplier Name' as issue_type,
    s."practiceId",
    s.name,
    COUNT(*) as duplicate_count,
    STRING_AGG(s.id, ', ') as supplier_ids
FROM "Supplier" s
GROUP BY s."practiceId", s.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Find duplicate GlobalSupplier names
SELECT 
    'Duplicate GlobalSupplier Name' as issue_type,
    gs.name,
    COUNT(*) as duplicate_count,
    STRING_AGG(gs.id, ', ') as supplier_ids
FROM "GlobalSupplier" gs
GROUP BY gs.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =============================================================================
-- SUMMARY COUNTS
-- =============================================================================

-- Generate summary of all potential issues
SELECT 'VALIDATION SUMMARY' as report_section;

SELECT 
    'Negative Inventory Records' as check_name,
    COUNT(*) as violation_count
FROM "LocationInventory"
WHERE quantity < 0

UNION ALL

SELECT 
    'OrderItem Invalid Quantities' as check_name,
    COUNT(*) as violation_count
FROM "OrderItem"
WHERE quantity <= 0

UNION ALL

SELECT 
    'GoodsReceiptLine Invalid Quantities' as check_name,
    COUNT(*) as violation_count
FROM "GoodsReceiptLine"
WHERE quantity <= 0

UNION ALL

SELECT 
    'InventoryTransfer Invalid Quantities' as check_name,
    COUNT(*) as violation_count
FROM "InventoryTransfer"
WHERE quantity <= 0

UNION ALL

SELECT 
    'Same Location Transfers' as check_name,
    COUNT(*) as violation_count
FROM "InventoryTransfer"
WHERE "fromLocationId" = "toLocationId"

UNION ALL

SELECT 
    'SENT Orders Without sentAt' as check_name,
    COUNT(*) as violation_count
FROM "Order"
WHERE status = 'SENT' AND "sentAt" IS NULL

UNION ALL

SELECT 
    'CONFIRMED Receipts Without receivedAt' as check_name,
    COUNT(*) as violation_count
FROM "GoodsReceipt"
WHERE status = 'CONFIRMED' AND "receivedAt" IS NULL

UNION ALL

SELECT 
    'Negative Prices' as check_name,
    (SELECT COUNT(*) FROM "OrderItem" WHERE "unitPrice" < 0) +
    (SELECT COUNT(*) FROM "SupplierItem" WHERE "unitPrice" < 0) +
    (SELECT COUNT(*) FROM "SupplierCatalog" WHERE "unitPrice" < 0) as violation_count

ORDER BY violation_count DESC;

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================
-- 
-- How to run these queries:
-- 
-- Option 1: Via Prisma Studio / pgAdmin
--   - Connect to your database
--   - Run queries one by one or as a group
--   - Review results
-- 
-- Option 2: Via psql command line
--   psql $DATABASE_URL -f prisma/validation-queries.sql
-- 
-- Option 3: Via Node.js script
--   Create a script that uses Prisma's $queryRaw to run these
-- 
-- If any queries return results:
--   1. Review the data carefully
--   2. Determine if it's valid data or actual violations
--   3. Fix or delete invalid records before migration
--   4. Document decisions in migration log
-- 
-- If all queries return 0 rows:
--   ✅ Database is ready for constraint migration!
-- 
-- =============================================================================

