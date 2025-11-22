import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ownerService } from '@/src/services/owner/owner-service';
import { prisma } from '@/lib/prisma';
import { isPlatformOwner } from '@/lib/owner-guard';
import { ForbiddenError, UnauthorizedError } from '@/src/domain/errors';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    practice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/owner-guard', () => ({
  isPlatformOwner: vi.fn(),
}));

describe('OwnerService', () => {
  const mockPlatformOwnerEmail = 'owner@venzory.com';
  const mockUserEmail = 'user@venzory.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPractices', () => {
    it('should list practices for platform owner', async () => {
      vi.mocked(isPlatformOwner).mockReturnValue(true);
      vi.mocked(prisma.practice.findMany).mockResolvedValue([
        {
          id: 'p1',
          name: 'Practice 1',
          slug: 'p1',
          createdAt: new Date(),
          onboardingCompletedAt: new Date(),
          _count: { users: 5 },
        },
      ] as any);

      const result = await ownerService.listPractices(mockPlatformOwnerEmail);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Practice 1');
      expect(result[0].status).toBe('Active');
      expect(prisma.practice.findMany).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for non-owner', async () => {
      vi.mocked(isPlatformOwner).mockReturnValue(false);
      await expect(ownerService.listPractices(mockUserEmail))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw UnauthorizedError for missing email', async () => {
        await expect(ownerService.listPractices(null))
            .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getPracticeMembers', () => {
      it('should return practice members for platform owner', async () => {
          vi.mocked(isPlatformOwner).mockReturnValue(true);
          vi.mocked(prisma.practice.findUnique).mockResolvedValue({
              id: 'p1',
              name: 'Practice 1',
              slug: 'p1',
              users: [
                  {
                      role: 'ADMIN',
                      status: 'ACTIVE',
                      user: {
                          id: 'u1',
                          name: 'Admin User',
                          email: 'admin@p1.com',
                          image: null
                      }
                  }
              ]
          } as any);

          const result = await ownerService.getPracticeMembers(mockPlatformOwnerEmail, 'p1');
          expect(result).not.toBeNull();
          expect(result?.practice.name).toBe('Practice 1');
          expect(result?.members).toHaveLength(1);
          expect(result?.members[0].email).toBe('admin@p1.com');
      });

      it('should throw ForbiddenError for non-owner', async () => {
          vi.mocked(isPlatformOwner).mockReturnValue(false);
          await expect(ownerService.getPracticeMembers(mockUserEmail, 'p1'))
              .rejects.toThrow(ForbiddenError);
      });
  });
});

