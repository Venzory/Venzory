import { NextResponse } from 'next/server';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { isDomainError } from '@/src/domain/errors';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from '@/lib/prisma-transforms';
import { resolveAssetUrl } from '@/src/lib/storage';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { session, practiceId } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Fetch product with GS1 data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        packaging: {
          orderBy: { level: 'asc' },
        },
        items: {
          where: { practiceId },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch supplier offers for this product from practice's linked suppliers
    const supplierItems = await prisma.supplierItem.findMany({
      where: {
        productId,
        globalSupplier: {
          practiceLinks: {
            some: {
              practiceId,
              isBlocked: false,
            },
          },
        },
        isActive: true,
      },
      include: {
        globalSupplier: {
          include: {
            practiceLinks: {
              where: { practiceId },
              take: 1,
            },
          },
        },
      },
      orderBy: { unitPrice: 'asc' },
    });

    // Check if product is in catalog (practice has an Item for it)
    const existingItem = product.items[0] || null;
    const inCatalog = !!existingItem;

    // Find cheapest offer
    const cheapestPrice = supplierItems.reduce((min, item) => {
      const price = decimalToNumber(item.unitPrice);
      if (price === null) return min;
      return min === null ? price : Math.min(min, price);
    }, null as number | null);

    // Build offers with practice supplier info
    const offers = supplierItems.map((item) => {
      const practiceSupplier = item.globalSupplier.practiceLinks[0];
      const unitPrice = decimalToNumber(item.unitPrice);
      const isCheapest = unitPrice !== null && cheapestPrice !== null && unitPrice === cheapestPrice;

      return {
        id: item.id,
        supplierName: item.globalSupplier.name,
        supplierSku: item.supplierSku,
        unitPrice,
        currency: item.currency,
        minOrderQty: item.minOrderQty,
        leadTimeDays: item.leadTimeDays,
        packSize: item.supplierDescription, // Using description as pack size for now
        isPreferred: practiceSupplier?.isPreferred || false,
        isCheapest,
        hasContract: false, // TODO: Add contract flag to PracticeSupplier
        practiceSupplier: practiceSupplier
          ? {
              id: practiceSupplier.id,
              customLabel: practiceSupplier.customLabel,
              isPreferred: practiceSupplier.isPreferred,
              globalSupplier: {
                id: item.globalSupplier.id,
                name: item.globalSupplier.name,
              },
            }
          : null,
      };
    });

    // Get primary image
    const primaryMedia = product.media[0];
    const primaryImage = primaryMedia
      ? {
          id: primaryMedia.id,
          url: resolveAssetUrl(primaryMedia),
          isPrimary: primaryMedia.isPrimary,
          type: primaryMedia.type,
        }
      : null;

    // Build packaging info
    const packaging = product.packaging.map((pkg) => ({
      level: pkg.level,
      childCount: pkg.childCount,
      gtin: pkg.gtin,
    }));

    // Build response
    const response = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      description: product.description,
      shortDescription: product.shortDescription,
      gtin: product.gtin,
      manufacturerName: product.manufacturerName,
      manufacturerGln: product.manufacturerGln,
      // Physical attributes
      netContentValue: decimalToNumber(product.netContentValue),
      netContentUom: product.netContentUom,
      grossWeight: decimalToNumber(product.grossWeight),
      grossWeightUom: product.grossWeightUom,
      // Medical device
      isRegulatedDevice: product.isRegulatedDevice,
      deviceRiskClass: product.deviceRiskClass,
      udiDi: product.udiDi,
      // GS1 status
      isGs1Product: product.isGs1Product,
      gs1VerificationStatus: product.gs1VerificationStatus,
      // Related data
      primaryImage,
      packaging,
      offers,
      // Catalog status
      inCatalog,
      itemId: existingItem?.id || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (isDomainError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[product-detail] Unexpected error', error);
    return NextResponse.json({ error: 'Failed to load product details' }, { status: 500 });
  }
}

