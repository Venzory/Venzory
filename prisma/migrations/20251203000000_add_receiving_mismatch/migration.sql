-- Receiving Mismatch Migration
-- Adds mismatch tracking for receiving discrepancies

-- CreateEnum
CREATE TYPE "MismatchType" AS ENUM ('SHORT', 'OVER', 'DAMAGE', 'SUBSTITUTION');

-- CreateEnum
CREATE TYPE "MismatchStatus" AS ENUM ('OPEN', 'RESOLVED', 'NEEDS_SUPPLIER_CORRECTION');

-- CreateTable
CREATE TABLE "ReceivingMismatch" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "orderId" TEXT,
    "goodsReceiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "practiceSupplierId" TEXT,
    "type" "MismatchType" NOT NULL,
    "status" "MismatchStatus" NOT NULL DEFAULT 'OPEN',
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "varianceQuantity" INTEGER NOT NULL,
    "note" TEXT,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingMismatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceivingMismatch_practiceId_status_idx" ON "ReceivingMismatch"("practiceId", "status");

-- CreateIndex
CREATE INDEX "ReceivingMismatch_practiceId_createdAt_idx" ON "ReceivingMismatch"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "ReceivingMismatch_goodsReceiptId_idx" ON "ReceivingMismatch"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "ReceivingMismatch_orderId_idx" ON "ReceivingMismatch"("orderId");

-- CreateIndex
CREATE INDEX "ReceivingMismatch_practiceSupplierId_idx" ON "ReceivingMismatch"("practiceSupplierId");

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingMismatch" ADD CONSTRAINT "ReceivingMismatch_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

