-- AddPracticeSupplierId to OrderTemplateItem and GoodsReceipt (Phase 3)

-- AlterTable OrderTemplateItem: Add practiceSupplierId column
ALTER TABLE "OrderTemplateItem" ADD COLUMN "practiceSupplierId" TEXT;

-- AlterTable GoodsReceipt: Add practiceSupplierId column
ALTER TABLE "GoodsReceipt" ADD COLUMN "practiceSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "OrderTemplateItem_practiceSupplierId_idx" ON "OrderTemplateItem"("practiceSupplierId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_practiceSupplierId_idx" ON "GoodsReceipt"("practiceSupplierId");

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

