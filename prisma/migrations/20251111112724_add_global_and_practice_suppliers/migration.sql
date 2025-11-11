-- CreateTable
CREATE TABLE "GlobalSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSupplier" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "globalSupplierId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "customLabel" TEXT,
    "orderingNotes" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "migratedFromSupplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalSupplier_name_idx" ON "GlobalSupplier"("name");

-- CreateIndex
CREATE INDEX "PracticeSupplier_practiceId_idx" ON "PracticeSupplier"("practiceId");

-- CreateIndex
CREATE INDEX "PracticeSupplier_globalSupplierId_idx" ON "PracticeSupplier"("globalSupplierId");

-- CreateIndex
CREATE INDEX "PracticeSupplier_migratedFromSupplierId_idx" ON "PracticeSupplier"("migratedFromSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSupplier_practiceId_globalSupplierId_key" ON "PracticeSupplier"("practiceId", "globalSupplierId");

-- AddForeignKey
ALTER TABLE "PracticeSupplier" ADD CONSTRAINT "PracticeSupplier_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSupplier" ADD CONSTRAINT "PracticeSupplier_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "GlobalSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

