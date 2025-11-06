/*
  Warnings:

  - Added the required column `productId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gs1VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('MANUAL', 'API', 'EDI', 'OCI', 'CSV');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "productId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "street" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "gtin" TEXT,
    "brand" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isGs1Product" BOOLEAN NOT NULL DEFAULT false,
    "gs1VerificationStatus" "Gs1VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "gs1VerifiedAt" TIMESTAMP(3),
    "gs1Data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCatalog" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "unitPrice" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'EUR',
    "minOrderQty" INTEGER DEFAULT 1,
    "integrationType" "IntegrationType" NOT NULL DEFAULT 'MANUAL',
    "integrationConfig" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemReceipt" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTemplate" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "defaultQuantity" INTEGER NOT NULL,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,
    "itemId" TEXT,
    "locationId" TEXT,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "role" "PracticeRole" NOT NULL DEFAULT 'STAFF',
    "inviterName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_gtin_key" ON "Product"("gtin");

-- CreateIndex
CREATE INDEX "Product_gtin_idx" ON "Product"("gtin");

-- CreateIndex
CREATE INDEX "Product_isGs1Product_idx" ON "Product"("isGs1Product");

-- CreateIndex
CREATE INDEX "SupplierCatalog_supplierId_idx" ON "SupplierCatalog"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierCatalog_productId_idx" ON "SupplierCatalog"("productId");

-- CreateIndex
CREATE INDEX "SupplierCatalog_isActive_idx" ON "SupplierCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCatalog_supplierId_productId_key" ON "SupplierCatalog"("supplierId", "productId");

-- CreateIndex
CREATE INDEX "OrderItemReceipt_orderItemId_idx" ON "OrderItemReceipt"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemReceipt_locationId_idx" ON "OrderItemReceipt"("locationId");

-- CreateIndex
CREATE INDEX "OrderTemplate_practiceId_idx" ON "OrderTemplate"("practiceId");

-- CreateIndex
CREATE INDEX "OrderTemplateItem_templateId_idx" ON "OrderTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "OrderTemplateItem_itemId_idx" ON "OrderTemplateItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTemplateItem_templateId_itemId_key" ON "OrderTemplateItem"("templateId", "itemId");

-- CreateIndex
CREATE INDEX "InAppNotification_practiceId_idx" ON "InAppNotification"("practiceId");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");

-- CreateIndex
CREATE INDEX "InAppNotification_read_idx" ON "InAppNotification"("read");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_token_key" ON "UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_token_idx" ON "UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_practiceId_idx" ON "UserInvite"("practiceId");

-- CreateIndex
CREATE INDEX "Item_productId_idx" ON "Item"("productId");

-- AddForeignKey
ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemReceipt" ADD CONSTRAINT "OrderItemReceipt_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemReceipt" ADD CONSTRAINT "OrderItemReceipt_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemReceipt" ADD CONSTRAINT "OrderItemReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
