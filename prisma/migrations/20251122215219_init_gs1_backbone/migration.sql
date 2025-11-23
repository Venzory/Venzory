/*
  Warnings:

  - You are about to drop the column `itemId` on the `SupplierItem` table. All the data in the column will be lost.
  - You are about to drop the column `practiceSupplierId` on the `SupplierItem` table. All the data in the column will be lost.
  - You are about to drop the `SupplierCatalog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[globalSupplierId,productId]` on the table `SupplierItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `globalSupplierId` to the `SupplierItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `SupplierItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SupplierCatalog" DROP CONSTRAINT "SupplierCatalog_practiceSupplierId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierCatalog" DROP CONSTRAINT "SupplierCatalog_productId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierItem" DROP CONSTRAINT "SupplierItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierItem" DROP CONSTRAINT "SupplierItem_practiceSupplierId_fkey";

-- DropIndex
DROP INDEX "SupplierItem_itemId_idx";

-- DropIndex
DROP INDEX "SupplierItem_practiceSupplierId_idx";

-- DropIndex
DROP INDEX "SupplierItem_practiceSupplierId_itemId_key";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "supplierItemId" TEXT;

-- AlterTable
ALTER TABLE "SupplierItem" DROP COLUMN "itemId",
DROP COLUMN "practiceSupplierId",
ADD COLUMN     "globalSupplierId" TEXT NOT NULL,
ADD COLUMN     "integrationConfig" JSONB,
ADD COLUMN     "integrationType" "IntegrationType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "productId" TEXT NOT NULL;

-- DropTable
DROP TABLE "SupplierCatalog";

-- CreateTable
CREATE TABLE "PracticeSupplierItem" (
    "id" TEXT NOT NULL,
    "practiceSupplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "unitPrice" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'EUR',
    "minOrderQty" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSupplierItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSupplierItem_itemId_idx" ON "PracticeSupplierItem"("itemId");

-- CreateIndex
CREATE INDEX "PracticeSupplierItem_practiceSupplierId_idx" ON "PracticeSupplierItem"("practiceSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSupplierItem_practiceSupplierId_itemId_key" ON "PracticeSupplierItem"("practiceSupplierId", "itemId");

-- CreateIndex
CREATE INDEX "Item_supplierItemId_idx" ON "Item"("supplierItemId");

-- CreateIndex
CREATE INDEX "Order_practiceId_createdAt_idx" ON "Order"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_practiceId_updatedAt_idx" ON "Order"("practiceId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupplierItem_globalSupplierId_idx" ON "SupplierItem"("globalSupplierId");

-- CreateIndex
CREATE INDEX "SupplierItem_productId_idx" ON "SupplierItem"("productId");

-- CreateIndex
CREATE INDEX "SupplierItem_isActive_idx" ON "SupplierItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItem_globalSupplierId_productId_key" ON "SupplierItem"("globalSupplierId", "productId");

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "GlobalSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSupplierItem" ADD CONSTRAINT "PracticeSupplierItem_practiceSupplierId_fkey" FOREIGN KEY ("practiceSupplierId") REFERENCES "PracticeSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSupplierItem" ADD CONSTRAINT "PracticeSupplierItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
