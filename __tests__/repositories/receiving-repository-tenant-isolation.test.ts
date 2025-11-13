/**
 * ReceivingRepository - Tenant Isolation Tests
 * Tests that receiving operations properly enforce tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ReceivingRepository } from '@/src/repositories/receiving';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/src/domain/errors';

describe('ReceivingRepository - Tenant Isolation', () => {
  let receivingRepo: ReceivingRepository;
  let practice1Id: string;
  let practice2Id: string;
  let location1Id: string;
  let receipt1Id: string;
  let receiptLine1Id: string;
  let item1Id: string;
  let product1Id: string;

  beforeAll(async () => {
    receivingRepo = new ReceivingRepository();

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-test-receiving-isolation' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-test-receiving-isolation' },
    });
    practice2Id = practice2.id;

    // Create location
    const location1 = await prisma.location.create({
      data: { practiceId: practice1Id, name: 'Location 1', code: 'LOC1' },
    });
    location1Id = location1.id;

    // Create a product and item
    const product = await prisma.product.create({
      data: { name: 'Test Product', gtin: '12345678901236' },
    });
    product1Id = product.id;

    const item1 = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Item 1',
        sku: 'RECITEM1',
      },
    });
    item1Id = item1.id;

    // Create a goods receipt for practice1
    const receipt = await prisma.goodsReceipt.create({
      data: {
        practiceId: practice1Id,
        locationId: location1Id,
        status: 'DRAFT',
      },
    });
    receipt1Id = receipt.id;

    // Add a receipt line
    const receiptLine = await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt1Id,
        itemId: item1Id,
        quantity: 10,
      },
    });
    receiptLine1Id = receiptLine.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.goodsReceiptLine.deleteMany({
      where: { receiptId: receipt1Id },
    });
    await prisma.goodsReceipt.deleteMany({
      where: { id: receipt1Id },
    });
    await prisma.item.deleteMany({
      where: { id: item1Id },
    });
    await prisma.location.deleteMany({
      where: { id: location1Id },
    });
    await prisma.product.deleteMany({
      where: { id: product1Id },
    });
    await prisma.practice.deleteMany({
      where: { id: { in: [practice1Id, practice2Id] } },
    });
  });

  describe('findReceiptLineById', () => {
    it('should NOT find receipt line from different practice', async () => {
      await expect(
        receivingRepo.findReceiptLineById(receiptLine1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should find receipt line from same practice', async () => {
      const result = await receivingRepo.findReceiptLineById(
        receiptLine1Id,
        practice1Id
      );
      expect(result).not.toBeNull();
      expect(result.id).toBe(receiptLine1Id);
      expect(result.quantity).toBe(10);
    });
  });

  describe('updateReceiptLine', () => {
    it('should NOT update receipt line from different practice', async () => {
      await expect(
        receivingRepo.updateReceiptLine(receiptLine1Id, practice2Id, {
          quantity: 20,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update receipt line from same practice', async () => {
      const result = await receivingRepo.updateReceiptLine(
        receiptLine1Id,
        practice1Id,
        {
          quantity: 15,
        }
      );
      expect(result.quantity).toBe(15);

      // Reset for other tests
      await receivingRepo.updateReceiptLine(receiptLine1Id, practice1Id, {
        quantity: 10,
      });
    });
  });

  describe('removeReceiptLine', () => {
    it('should NOT remove receipt line from different practice', async () => {
      await expect(
        receivingRepo.removeReceiptLine(receiptLine1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should remove receipt line from same practice', async () => {
      // Create a test line to remove
      const testLine = await prisma.goodsReceiptLine.create({
        data: {
          receiptId: receipt1Id,
          itemId: item1Id,
          quantity: 5,
        },
      });

      // Should not throw
      await receivingRepo.removeReceiptLine(testLine.id, practice1Id);

      // Verify it's gone
      const result = await prisma.goodsReceiptLine.findUnique({
        where: { id: testLine.id },
      });
      expect(result).toBeNull();
    });
  });
});

