/**
 * PracticeSupplierRepository Integration Tests
 * Tests for listing, creating, updating, and blocking/unblocking suppliers
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { prisma } from '@/lib/prisma';

describe('PracticeSupplierRepository Integration', () => {
  let repository: PracticeSupplierRepository;
  let practice1Id: string;
  let practice2Id: string;
  let globalSupplier1Id: string;
  let globalSupplier2Id: string;
  let practiceSupplier1Id: string;

  beforeAll(async () => {
    repository = new PracticeSupplierRepository();

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-test-supplier-repo' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-test-supplier-repo' },
    });
    practice2Id = practice2.id;

    // Create global suppliers
    const globalSupplier1 = await prisma.globalSupplier.create({
      data: {
        name: 'Test Supplier 1',
        email: 'supplier1@example.com',
        phone: '123-456-7890',
        website: 'https://supplier1.example.com',
      },
    });
    globalSupplier1Id = globalSupplier1.id;

    const globalSupplier2 = await prisma.globalSupplier.create({
      data: {
        name: 'Test Supplier 2',
        email: 'supplier2@example.com',
      },
    });
    globalSupplier2Id = globalSupplier2.id;

    // Create a practice supplier for practice1
    const practiceSupplier1 = await prisma.practiceSupplier.create({
      data: {
        practiceId: practice1Id,
        globalSupplierId: globalSupplier1Id,
        customLabel: 'Custom Supplier Name',
        accountNumber: 'ACC-12345',
        isPreferred: true,
        isBlocked: false,
      },
    });
    practiceSupplier1Id = practiceSupplier1.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.practiceSupplier.deleteMany({
      where: { practiceId: { in: [practice1Id, practice2Id] } },
    });
    await prisma.globalSupplier.deleteMany({
      where: { id: { in: [globalSupplier1Id, globalSupplier2Id] } },
    });
    await prisma.practice.deleteMany({
      where: { id: { in: [practice1Id, practice2Id] } },
    });
  });

  describe('findPracticeSuppliers', () => {
    it('should return practice suppliers with global supplier info', async () => {
      const suppliers = await repository.findPracticeSuppliers(practice1Id);

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].id).toBe(practiceSupplier1Id);
      expect(suppliers[0].customLabel).toBe('Custom Supplier Name');
      expect(suppliers[0].globalSupplier.name).toBe('Test Supplier 1');
      expect(suppliers[0].isPreferred).toBe(true);
      expect(suppliers[0].isBlocked).toBe(false);
    });

    it('should exclude blocked suppliers by default', async () => {
      // Block the supplier
      await prisma.practiceSupplier.update({
        where: { id: practiceSupplier1Id },
        data: { isBlocked: true },
      });

      const suppliers = await repository.findPracticeSuppliers(practice1Id);

      expect(suppliers).toHaveLength(0);

      // Restore
      await prisma.practiceSupplier.update({
        where: { id: practiceSupplier1Id },
        data: { isBlocked: false },
      });
    });

    it('should include blocked suppliers when includeBlocked is true', async () => {
      // Block the supplier
      await prisma.practiceSupplier.update({
        where: { id: practiceSupplier1Id },
        data: { isBlocked: true },
      });

      const suppliers = await repository.findPracticeSuppliers(practice1Id, {
        includeBlocked: true,
      });

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].isBlocked).toBe(true);

      // Restore
      await prisma.practiceSupplier.update({
        where: { id: practiceSupplier1Id },
        data: { isBlocked: false },
      });
    });

    it('should filter for preferred suppliers only', async () => {
      // Create a non-preferred supplier
      const nonPreferredSupplier = await prisma.practiceSupplier.create({
        data: {
          practiceId: practice1Id,
          globalSupplierId: globalSupplier2Id,
          isPreferred: false,
          isBlocked: false,
        },
      });

      const suppliers = await repository.findPracticeSuppliers(practice1Id, {
        preferredOnly: true,
      });

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].isPreferred).toBe(true);

      // Clean up
      await prisma.practiceSupplier.delete({
        where: { id: nonPreferredSupplier.id },
      });
    });

    it('should not return suppliers from other practices', async () => {
      const suppliers = await repository.findPracticeSuppliers(practice2Id);

      expect(suppliers).toHaveLength(0);
    });
  });

  describe('linkPracticeToGlobalSupplier', () => {
    it('should create a practice supplier link', async () => {
      const result = await repository.linkPracticeToGlobalSupplier({
        practiceId: practice2Id,
        globalSupplierId: globalSupplier1Id,
        accountNumber: 'ACC-99999',
        customLabel: 'Practice 2 Custom Name',
        orderingNotes: 'Special instructions',
        isPreferred: false,
        isBlocked: false,
      });

      expect(result.practiceId).toBe(practice2Id);
      expect(result.globalSupplierId).toBe(globalSupplier1Id);
      expect(result.accountNumber).toBe('ACC-99999');
      expect(result.customLabel).toBe('Practice 2 Custom Name');
      expect(result.orderingNotes).toBe('Special instructions');
      expect(result.globalSupplier.name).toBe('Test Supplier 1');

      // Clean up
      await prisma.practiceSupplier.delete({
        where: { id: result.id },
      });
    });

    it('should prevent duplicate links (unique constraint)', async () => {
      // Try to link the same supplier again
      await expect(
        repository.linkPracticeToGlobalSupplier({
          practiceId: practice1Id,
          globalSupplierId: globalSupplier1Id,
          accountNumber: null,
          customLabel: null,
          orderingNotes: null,
          isPreferred: false,
          isBlocked: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('updatePracticeSupplier', () => {
    it('should update practice supplier settings', async () => {
      const result = await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          accountNumber: 'ACC-UPDATED',
          customLabel: 'Updated Custom Name',
          orderingNotes: 'Updated notes',
          isPreferred: false,
          isBlocked: false,
        }
      );

      expect(result.accountNumber).toBe('ACC-UPDATED');
      expect(result.customLabel).toBe('Updated Custom Name');
      expect(result.orderingNotes).toBe('Updated notes');
      expect(result.isPreferred).toBe(false);

      // Restore
      await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          accountNumber: 'ACC-12345',
          customLabel: 'Custom Supplier Name',
          orderingNotes: null,
          isPreferred: true,
          isBlocked: false,
        }
      );
    });

    it('should toggle isBlocked flag', async () => {
      // Block the supplier
      let result = await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          isBlocked: true,
        }
      );

      expect(result.isBlocked).toBe(true);

      // Unblock the supplier
      result = await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          isBlocked: false,
        }
      );

      expect(result.isBlocked).toBe(false);
    });

    it('should toggle isPreferred flag', async () => {
      // Unmark as preferred
      let result = await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          isPreferred: false,
        }
      );

      expect(result.isPreferred).toBe(false);

      // Mark as preferred again
      result = await repository.updatePracticeSupplier(
        practiceSupplier1Id,
        practice1Id,
        {
          isPreferred: true,
        }
      );

      expect(result.isPreferred).toBe(true);
    });
  });

  describe('findPracticeSupplierById', () => {
    it('should find practice supplier by id', async () => {
      const result = await repository.findPracticeSupplierById(
        practiceSupplier1Id,
        practice1Id
      );

      expect(result.id).toBe(practiceSupplier1Id);
      expect(result.globalSupplier.name).toBe('Test Supplier 1');
    });

    it('should throw NotFoundError when supplier does not exist', async () => {
      await expect(
        repository.findPracticeSupplierById('non-existent-id', practice1Id)
      ).rejects.toThrow();
    });

    it('should throw NotFoundError when accessing supplier from different practice', async () => {
      await expect(
        repository.findPracticeSupplierById(practiceSupplier1Id, practice2Id)
      ).rejects.toThrow();
    });
  });

  describe('unlinkPracticeSupplier', () => {
    it('should delete practice supplier link', async () => {
      // Create a temporary link
      const tempLink = await repository.linkPracticeToGlobalSupplier({
        practiceId: practice2Id,
        globalSupplierId: globalSupplier2Id,
        accountNumber: null,
        customLabel: null,
        orderingNotes: null,
        isPreferred: false,
        isBlocked: false,
      });

      // Unlink it
      await repository.unlinkPracticeSupplier(tempLink.id, practice2Id);

      // Verify it's gone
      const suppliers = await repository.findPracticeSuppliers(practice2Id, {
        includeBlocked: true,
      });
      expect(suppliers.find((s) => s.id === tempLink.id)).toBeUndefined();
    });
  });
});

