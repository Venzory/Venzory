/*
  Warnings:

  - You are about to drop the `OrderItemReceipt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderItemReceipt" DROP CONSTRAINT "OrderItemReceipt_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OrderItemReceipt" DROP CONSTRAINT "OrderItemReceipt_locationId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItemReceipt" DROP CONSTRAINT "OrderItemReceipt_orderItemId_fkey";

-- DropTable
DROP TABLE "OrderItemReceipt";
