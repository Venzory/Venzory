/**
 * StockCountRepository - Tenant Isolation Tests
 * Tests that stock count operations properly enforce tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/src/domain/errors';

describe('StockCountRepository - Tenant Isolation', () => {
  let stockCountRepo: StockCountRepository;
  let practice1Id: string;
  let practice2Id: string;
  let location1Id: string;
  let session1Id: string;
  let countLine1Id: string;
  let item1Id: string;
  let product1Id: string;
  let user1Id: string;

  beforeAll(async () => {
    stockCountRepo = new StockCountRepository();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-stockcount@example.com',
        name: 'Test User',
      },
    });
    user1Id = user.id;

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-test-stockcount-isolation' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-test-stockcount-isolation' },
    });
    practice2Id = practice2.id;

    // Create location
    const location1 = await prisma.location.create({
      data: { practiceId: practice1Id, name: 'Location 1', code: 'LOC1' },
    });
    location1Id = location1.id;

    // Create a product and item
    const product = await prisma.product.create({
      data: { name: 'Test Product', gtin: '12345678901237' },
    });
    product1Id = product.id;

    const item1 = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Item 1',
        sku: 'SCITEM1',
      },
    });
    item1Id = item1.id;

    // Create a stock count session for practice1
    const session = await prisma.stockCountSession.create({
      data: {
        practiceId: practice1Id,
        locationId: location1Id,
        status: 'IN_PROGRESS',
        createdById: user1Id,
      },
    });
    session1Id = session.id;

    // Add a count line
    const countLine = await prisma.stockCountLine.create({
      data: {
        sessionId: session1Id,
        itemId: item1Id,
        countedQuantity: 10,
        systemQuantity: 10,
        variance: 0,
      },
    });
    countLine1Id = countLine.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.stockCountLine.deleteMany({
      where: { sessionId: session1Id },
    });
    await prisma.stockCountSession.deleteMany({
      where: { id: session1Id },
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
    await prisma.user.deleteMany({
      where: { id: user1Id },
    });
  });

  describe('findStockCountLineById', () => {
    it('should NOT find count line from different practice', async () => {
      await expect(
        stockCountRepo.findStockCountLineById(countLine1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should find count line from same practice', async () => {
      const result = await stockCountRepo.findStockCountLineById(
        countLine1Id,
        practice1Id
      );
      expect(result).not.toBeNull();
      expect(result.id).toBe(countLine1Id);
      expect(result.countedQuantity).toBe(10);
    });
  });

  describe('updateStockCountLine', () => {
    it('should NOT update count line from different practice', async () => {
      await expect(
        stockCountRepo.updateStockCountLine(
          countLine1Id,
          20,
          10,
          practice2Id,
          null
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should update count line from same practice', async () => {
      const result = await stockCountRepo.updateStockCountLine(
        countLine1Id,
        15,
        5,
        practice1Id,
        null
      );
      expect(result.countedQuantity).toBe(15);
      expect(result.variance).toBe(5);

      // Reset for other tests
      await stockCountRepo.updateStockCountLine(
        countLine1Id,
        10,
        0,
        practice1Id,
        null
      );
    });
  });

  describe('deleteStockCountLine', () => {
    it('should NOT delete count line from different practice', async () => {
      await expect(
        stockCountRepo.deleteStockCountLine(countLine1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should delete count line from same practice', async () => {
      // Create a test line to delete
      const testLine = await prisma.stockCountLine.create({
        data: {
          sessionId: session1Id,
          itemId: item1Id,
          countedQuantity: 5,
          systemQuantity: 5,
          variance: 0,
        },
      });

      // Should not throw
      await stockCountRepo.deleteStockCountLine(testLine.id, practice1Id);

      // Verify it's gone
      const result = await prisma.stockCountLine.findUnique({
        where: { id: testLine.id },
      });
      expect(result).toBeNull();
    });
  });
});

