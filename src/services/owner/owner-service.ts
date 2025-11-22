import { prisma } from '@/lib/prisma';
import { isPlatformOwner } from '@/lib/owner-guard';
import { ForbiddenError, UnauthorizedError } from '@/src/domain/errors';

export class OwnerService {
  /**
   * List all practices with summary details.
   * Requires platform owner permissions.
   */
  async listPractices(userEmail: string | null | undefined) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const practices = await prisma.practice.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        onboardingCompletedAt: true,
        _count: {
          select: {
            users: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return practices.map(p => ({
      ...p,
      status: p.onboardingCompletedAt ? 'Active' : 'Onboarding',
      userCount: p._count.users,
    }));
  }

  /**
   * Get members of a specific practice.
   * Requires platform owner permissions.
   */
  async getPracticeMembers(userEmail: string | null | undefined, practiceId: string) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        name: true,
        slug: true,
        users: {
          select: {
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          },
          orderBy: {
            role: 'asc', // ADMIN first (if enum is ordered that way, otherwise might need sort)
          }
        }
      }
    });

    if (!practice) {
      return null;
    }

    return {
      practice: {
        id: practice.id,
        name: practice.name,
        slug: practice.slug,
      },
      members: practice.users.map(u => ({
        userId: u.user.id,
        name: u.user.name,
        email: u.user.email,
        role: u.role,
        status: u.status,
        image: u.user.image,
      }))
    };
  }
}

export const ownerService = new OwnerService();

