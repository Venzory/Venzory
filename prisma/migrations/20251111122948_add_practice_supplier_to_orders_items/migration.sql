-- Phase 2: Add PracticeSupplier support to Orders, Items, and SupplierItems
-- This migration adds nullable foreign keys to enable dual-supplier pattern during transition

-- AlterTable: Add practiceSupplierId to Order
ALTER TABLE "Order" ADD COLUMN "practiceSupplierId" TEXT;

-- AlterTable: Add practiceSupplierId to SupplierItem
ALTER TABLE "SupplierItem" ADD COLUMN "practiceSupplierId" TEXT;

-- AlterTable: Add defaultPracticeSupplierId to Item
ALTER TABLE "Item" ADD COLUMN "defaultPracticeSupplierId" TEXT;

-- CreateIndex: Add index on Order.practiceSupplierId
CREATE INDEX "Order_practiceSupplierId_idx" ON "Order"("practiceSupplierId");

-- CreateIndex: Add index on SupplierItem.practiceSupplierId
CREATE INDEX "SupplierItem_practiceSupplierId_idx" ON "SupplierItem"("practiceSupplierId");

-- CreateIndex: Add index on Item.defaultPracticeSupplierId
CREATE INDEX "Item_defaultPracticeSupplierId_idx" ON "Item"("defaultPracticeSupplierId");

-- AddForeignKey: Link Order to PracticeSupplier
ALTER TABLE "Order" ADD CONSTRAINT "Order_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Link SupplierItem to PracticeSupplier
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Link Item to PracticeSupplier as default
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultPracticeSupplierId_fkey" FOREIGN KEY ("defaultPracticeSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

