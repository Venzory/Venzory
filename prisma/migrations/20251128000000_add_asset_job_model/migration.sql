-- CreateEnum
CREATE TYPE "AssetJobType" AS ENUM ('MEDIA_DOWNLOAD', 'DOCUMENT_DOWNLOAD');

-- CreateTable
CREATE TABLE "AssetJob" (
    "id" TEXT NOT NULL,
    "type" "AssetJobType" NOT NULL,
    "assetId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AssetJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetJob_status_idx" ON "AssetJob"("status");

-- CreateIndex
CREATE INDEX "AssetJob_productId_idx" ON "AssetJob"("productId");

-- CreateIndex
CREATE INDEX "AssetJob_createdAt_idx" ON "AssetJob"("createdAt");

-- CreateIndex
CREATE INDEX "AssetJob_type_status_idx" ON "AssetJob"("type", "status");

