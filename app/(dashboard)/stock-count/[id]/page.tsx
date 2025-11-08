import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CountSessionDetail } from './_components/count-session-detail';
import { StockCountStatus } from '@prisma/client';

interface CountSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CountSessionPage({ params }: CountSessionPageProps) {
  const { practiceId } = await requireActivePractice();
  const { id } = await params;

  const session = await prisma.stockCountSession.findUnique({
    where: {
      id,
      practiceId,
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
        },
      },
      lines: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              product: {
                select: {
                  gtin: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  // Fetch all items for adding manually
  const items = await prisma.item.findMany({
    where: { practiceId },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      product: {
        select: {
          gtin: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch inventory at this location for quick counting
  const locationInventory = await prisma.locationInventory.findMany({
    where: {
      locationId: session.location.id,
      quantity: { gt: 0 }, // Only items with stock
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          product: {
            select: {
              gtin: true,
            },
          },
        },
      },
    },
    orderBy: {
      item: { name: 'asc' },
    },
  });

  // Map to expected items format
  const countedItemIds = new Set(session.lines.map((line) => line.item.id));
  const expectedItems = locationInventory
    .filter((inv) => !countedItemIds.has(inv.item.id))
    .map((inv) => ({
      itemId: inv.item.id,
      itemName: inv.item.name,
      itemSku: inv.item.sku,
      unit: inv.item.unit,
      systemQuantity: inv.quantity,
    }));

  const canEdit = session.status === StockCountStatus.IN_PROGRESS;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <CountSessionDetail
        session={session}
        items={items}
        expectedItems={expectedItems}
        canEdit={canEdit}
      />
    </div>
  );
}

