import { PrismaClient } from '@prisma/client';

export async function cleanDatabase(prisma: PrismaClient) {
  console.log('🧹 Cleaning existing data...');
  
  // Delete in order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.stockCountLine.deleteMany();
  await prisma.stockCountSession.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderTemplateItem.deleteMany();
  await prisma.orderTemplate.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.locationInventory.deleteMany();
  await prisma.supplierItem.deleteMany();
  await prisma.supplierCatalog.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.practiceSupplier.deleteMany();
  await prisma.globalSupplier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.practiceUser.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.practice.deleteMany();
  
  console.log('✨ Database cleaned');
}

