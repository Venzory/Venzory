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
   * Get product data overview for owner dashboard.
   * Requires platform owner permissions.
   */
  async getProductDataOverview(userEmail: string | null | undefined) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const [
      productCount,
      globalSupplierCount,
      catalogCount,
      itemCount,
      topPractices
    ] = await Promise.all([
      prisma.product.count(),
      prisma.globalSupplier.count(),
      prisma.supplierItem.count(),
      prisma.item.count(),
      prisma.practice.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              items: true,
              practiceSuppliers: true,
            }
          }
        },
        orderBy: {
          items: {
            _count: 'desc'
          }
        },
        take: 5
      })
    ]);

    return {
      counts: {
        products: productCount,
        globalSuppliers: globalSupplierCount,
        catalogEntries: catalogCount,
        items: itemCount,
      },
      topPractices: topPractices.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        itemCount: p._count.items,
        supplierCount: p._count.practiceSuppliers,
      }))
    };
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

