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
            locations: true,
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
      locationCount: p._count.locations,
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
        locations: {
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        },
        users: {
          select: {
            id: true,
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            },
            locationAccess: {
              select: {
                locationId: true,
                location: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: {
            role: 'asc', // OWNER first (enum is ordered OWNER, ADMIN, MANAGER, STAFF)
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
      locations: practice.locations,
      members: practice.users.map(u => ({
        membershipId: u.id,
        userId: u.user.id,
        name: u.user.name,
        email: u.user.email,
        role: u.role,
        status: u.status,
        image: u.user.image,
        // OWNER/ADMIN have access to all locations
        hasFullLocationAccess: u.role === 'OWNER' || u.role === 'ADMIN',
        locationAccess: u.locationAccess.map(la => ({
          locationId: la.locationId,
          locationName: la.location.name,
        })),
      }))
    };
  }

  /**
   * Get GS1 data quality statistics for owner dashboard.
   * Requires platform owner permissions.
   */
  async getGS1QualityStats(userEmail: string | null | undefined) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const [
      totalProducts,
      gs1VerifiedCount,
      lowQualityCount,
      missingMediaCount,
      missingDocumentsCount,
      missingRegulatoryCount,
      missingPackagingCount,
      needsReviewCount,
    ] = await Promise.all([
      // Total products
      prisma.product.count(),
      
      // GS1 verified products
      prisma.product.count({
        where: { gs1VerificationStatus: 'VERIFIED' },
      }),
      
      // Low quality score (< 50)
      prisma.productQualityScore.count({
        where: { overallScore: { lt: 50 } },
      }),
      
      // Products without media
      prisma.product.count({
        where: {
          media: { none: {} },
        },
      }),
      
      // Products without documents
      prisma.product.count({
        where: {
          documents: { none: {} },
        },
      }),
      
      // Regulated products without regulatory data
      prisma.product.count({
        where: {
          isRegulatedDevice: true,
          regulatory: { none: {} },
        },
      }),
      
      // Products without packaging
      prisma.product.count({
        where: {
          packaging: { none: {} },
        },
      }),
      
      // Supplier items needing review
      prisma.supplierItem.count({
        where: {
          isActive: true,
          OR: [
            { needsReview: true },
            { matchConfidence: { lt: 0.9 } },
            {
              matchConfidence: null,
              matchMethod: 'MANUAL',
            },
          ],
        },
      }),
    ]);

    return {
      totalProducts,
      gs1VerifiedCount,
      lowQualityCount,
      missingMediaCount,
      missingDocumentsCount,
      missingRegulatoryCount,
      missingPackagingCount,
      needsReviewCount,
    };
  }

  /**
   * Get products with lowest quality scores.
   * Requires platform owner permissions.
   */
  async getLowQualityProducts(
    userEmail: string | null | undefined, 
    limit: number = 20
  ) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const products = await prisma.product.findMany({
      where: {
        qualityScore: {
          overallScore: { lt: 50 },
        },
      },
      select: {
        id: true,
        name: true,
        gtin: true,
        brand: true,
        gs1VerificationStatus: true,
        isRegulatedDevice: true,
        qualityScore: {
          select: {
            overallScore: true,
            basicDataScore: true,
            gs1DataScore: true,
            mediaScore: true,
            documentScore: true,
            regulatoryScore: true,
            packagingScore: true,
            missingFields: true,
            warnings: true,
          },
        },
      },
      orderBy: {
        qualityScore: {
          overallScore: 'asc',
        },
      },
      take: limit,
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      gtin: p.gtin,
      brand: p.brand,
      gs1Status: p.gs1VerificationStatus,
      isRegulatedDevice: p.isRegulatedDevice,
      qualityScore: p.qualityScore?.overallScore ?? 0,
      componentScores: {
        basicData: p.qualityScore?.basicDataScore ?? 0,
        gs1Data: p.qualityScore?.gs1DataScore ?? 0,
        media: p.qualityScore?.mediaScore ?? 0,
        documents: p.qualityScore?.documentScore ?? 0,
        regulatory: p.qualityScore?.regulatoryScore ?? 0,
        packaging: p.qualityScore?.packagingScore ?? 0,
      },
      missingFields: p.qualityScore?.missingFields ?? [],
      warnings: p.qualityScore?.warnings ?? [],
    }));
  }

  /**
   * Get products missing critical data elements.
   * Requires platform owner permissions.
   */
  async getProductsMissingData(
    userEmail: string | null | undefined,
    dataType: 'media' | 'documents' | 'regulatory' | 'packaging',
    limit: number = 20
  ) {
    if (!userEmail) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!isPlatformOwner(userEmail)) {
      throw new ForbiddenError('Access denied: Platform Owner only');
    }

    const whereClause: any = {};
    
    switch (dataType) {
      case 'media':
        whereClause.media = { none: {} };
        break;
      case 'documents':
        whereClause.documents = { none: {} };
        break;
      case 'regulatory':
        whereClause.isRegulatedDevice = true;
        whereClause.regulatory = { none: {} };
        break;
      case 'packaging':
        whereClause.packaging = { none: {} };
        break;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        gtin: true,
        brand: true,
        gs1VerificationStatus: true,
        isRegulatedDevice: true,
        qualityScore: {
          select: {
            overallScore: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      gtin: p.gtin,
      brand: p.brand,
      gs1Status: p.gs1VerificationStatus,
      isRegulatedDevice: p.isRegulatedDevice,
      qualityScore: p.qualityScore?.overallScore ?? 0,
    }));
  }
}

export const ownerService = new OwnerService();

