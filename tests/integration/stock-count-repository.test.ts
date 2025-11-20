/**
 * Stock Count Repository Tests
 * Tests for stock count repository methods including the new findInProgressSessionByLocation helper
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { prisma } from '@/lib/prisma';
import { StockCountStatus } from '@prisma/client';

describe('StockCountRepository', () => {
  let repository: StockCountRepository;
  let testPracticeId: string;
  let testLocationId: string;
  let testUserId: string;
  let testProductId: string;

  beforeEach(async () => {
    repository = new StockCountRepository();

    // Create test practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Test Practice',
        slug: `test-practice-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        gtin: `${Date.now()}`,
      },
    });
    testProductId = product.id;

    // Create test location
    const location = await prisma.location.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Location',
        code: `LOC-${Date.now()}`,
      },
    });
    testLocationId = location.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.stockCountLine.deleteMany({ where: { session: { practiceId: testPracticeId } } });
    await prisma.stockCountSession.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.location.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.practice.deleteMany({ where: { id: testPracticeId } });
  });

  describe('findInProgressSessionByLocation', () => {
    it('should return null when no IN_PROGRESS session exists for location', async () => {
      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).toBeNull();
    });

    it('should return IN_PROGRESS session for location', async () => {
      // Create IN_PROGRESS session
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
        },
      });

      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session.id);
      expect(result?.status).toBe('IN_PROGRESS');
    });

    it('should not return COMPLETED session', async () => {
      // Create COMPLETED session
      await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'COMPLETED',
          createdById: testUserId,
          completedAt: new Date(),
        },
      });

      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).toBeNull();
    });

    it('should not return CANCELLED session', async () => {
      // Create CANCELLED session
      await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'CANCELLED',
          createdById: testUserId,
        },
      });

      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).toBeNull();
    });

    it('should only return sessions for the specified practice', async () => {
      // Create another practice
      const otherPractice = await prisma.practice.create({
        data: {
          name: 'Other Practice',
          slug: `other-practice-${Date.now()}`,
        },
      });

      // Create location in other practice
      const otherLocation = await prisma.location.create({
        data: {
          practiceId: otherPractice.id,
          name: 'Other Location',
          code: `OTHER-${Date.now()}`,
        },
      });

      // Create IN_PROGRESS session in other practice
      await prisma.stockCountSession.create({
        data: {
          practiceId: otherPractice.id,
          locationId: otherLocation.id,
          status: 'IN_PROGRESS',
          createdById: testUserId,
        },
      });

      // Should not find session from other practice
      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).toBeNull();

      // Clean up
      await prisma.stockCountSession.deleteMany({ where: { practiceId: otherPractice.id } });
      await prisma.location.deleteMany({ where: { practiceId: otherPractice.id } });
      await prisma.practice.deleteMany({ where: { id: otherPractice.id } });
    });

    it('should return most recent IN_PROGRESS session when multiple exist (edge case)', async () => {
      // This shouldn't happen in production due to our enforcement, but test the query behavior
      const session1 = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          createdAt: new Date('2024-01-01'),
        },
      });

      const session2 = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          createdAt: new Date('2024-01-02'),
        },
      });

      const result = await repository.findInProgressSessionByLocation(
        testPracticeId,
        testLocationId
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session2.id); // Should return the more recent one
    });
  });

  describe('findStockCountSessions', () => {
    it('should return sessions with variance fields in lines', async () => {
      // Create session with lines
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
        },
      });

      // Create item
      const item = await prisma.item.create({
        data: {
          practiceId: testPracticeId,
          productId: testProductId,
          name: 'Test Item',
          sku: 'TEST-001',
          unit: 'unit',
        },
      });

      // Create count line with variance
      await prisma.stockCountLine.create({
        data: {
          sessionId: session.id,
          itemId: item.id,
          countedQuantity: 8,
          systemQuantity: 10,
          variance: -2,
        },
      });

      const sessions = await repository.findStockCountSessions(testPracticeId);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].lines).toBeDefined();
      expect(sessions[0].lines).toHaveLength(1);
      expect(sessions[0].lines![0]).toHaveProperty('variance');
      expect(sessions[0].lines![0].variance).toBe(-2);
      expect(sessions[0].lines![0]).toHaveProperty('countedQuantity');
      expect(sessions[0].lines![0]).toHaveProperty('systemQuantity');
    });

    it('should always return an array even when no sessions exist', async () => {
      const sessions = await repository.findStockCountSessions(testPracticeId);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions).toHaveLength(0);
    });

    it('should always return lines as an array even when empty', async () => {
      // Create session without lines
      await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
        },
      });

      const sessions = await repository.findStockCountSessions(testPracticeId);

      expect(sessions).toHaveLength(1);
      expect(Array.isArray(sessions[0].lines)).toBe(true);
      expect(sessions[0].lines).toHaveLength(0);
    });
  });
});

