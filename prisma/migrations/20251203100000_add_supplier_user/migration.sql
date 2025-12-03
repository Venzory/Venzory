-- CreateEnum
CREATE TYPE "SupplierRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "SupplierUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "globalSupplierId" TEXT NOT NULL,
    "role" "SupplierRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierUser_userId_key" ON "SupplierUser"("userId");

-- CreateIndex
CREATE INDEX "SupplierUser_globalSupplierId_idx" ON "SupplierUser"("globalSupplierId");

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "GlobalSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

