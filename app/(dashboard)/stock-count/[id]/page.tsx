import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { notFound } from 'next/navigation';
import { CountSessionDetail } from './_components/count-session-detail';
import { StockCountStatus } from '@prisma/client';

interface CountSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CountSessionPage({ params }: CountSessionPageProps) {
  const { session: userSession, practiceId } = await requireActivePractice();
  const ctx = await buildRequestContext();
  const { id } = await params;

  // Fetch session using InventoryService
  let session;
  try {
    session = await getInventoryService().getStockCountSession(ctx, id);
  } catch (error) {
    notFound();
  }

  // Fetch all items for adding manually using InventoryService
  const allItems = await getInventoryService().findItems(ctx, {});
  const items = allItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    product: item.product ? {
      gtin: item.product?.gtin || null,
    } : null,
  }));

  // Get location inventory for this session's location
  const locationItems = allItems.filter(item => 
    item.inventory?.some(inv => 
      inv.locationId === session.location.id && inv.quantity > 0
    )
  );

  const locationInventory = locationItems.flatMap(item => 
    item.inventory
      ?.filter(inv => inv.locationId === session.location.id && inv.quantity > 0)
      .map(inv => ({
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          product: item.product ? {
            gtin: item.product?.gtin || null,
          } : null,
        },
        quantity: inv.quantity,
      })) || []
  );

  // Map to expected items format
  const countedItemIds = new Set(session.lines.map((line: any) => line.item.id));
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
        items={items as any}
        expectedItems={expectedItems}
        canEdit={canEdit}
      />
    </div>
  );
}

