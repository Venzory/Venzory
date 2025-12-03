import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getReceivingService, getInventoryService, getOrderService } from '@/src/services';
import { notFound } from 'next/navigation';
import { ReceiptDetail } from './_components/receipt-detail';
import { GoodsReceiptStatus } from '@prisma/client';
import type { GoodsReceiptWithRelations } from '@/src/domain/models';

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const ctx = await buildRequestContext();
  const { id } = await params;

  // Validate ID format
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    notFound();
  }

  // Fetch the receipt using service
  let receipt;
  try {
    receipt = await getReceivingService().getGoodsReceiptById(ctx, id);
  } catch (error) {
    notFound();
  }

  if (!receipt) {
    notFound();
  }

  // Fetch all items for adding manually
  const { items } = await getInventoryService().findItems(ctx, {}, { limit: 10000 }).catch(() => ({ items: [] }));

  // If linked to an order, fetch expected items and calculate what's already been received
  let expectedItems: Array<{
    itemId: string;
    itemName: string;
    itemSku: string | null;
    orderedQuantity: number;
    alreadyReceived: number;
    remainingQuantity: number;
    unit: string | null;
    productId: string | null;
  }> | null = null;

  if (receipt.orderId) {
    // Fetch the order with its items (tolerate missing orders)
    let order;
    try {
      order = await getOrderService().getOrderById(ctx, receipt.orderId);
    } catch (error) {
      // Order may have been deleted, continue without expected items
      order = null;
    }
    
    if (order && Array.isArray(order.items) && order.items.length > 0) {
      const orderItems = order.items;

      // Get all confirmed receipts for this order
      let confirmedReceipts: GoodsReceiptWithRelations[] = [];
      try {
        confirmedReceipts = await getReceivingService().findGoodsReceipts(ctx, {
          orderId: receipt.orderId,
          status: 'CONFIRMED',
        });
      } catch (error) {
        confirmedReceipts = [];
      }

      // Calculate what's already been received from confirmed receipts
      const receivedByItem = new Map<string, number>();
      const receivedInDraft = new Set<string>();

      for (const prevReceipt of confirmedReceipts) {
        if (Array.isArray(prevReceipt.lines)) {
          for (const line of prevReceipt.lines) {
            if (line && line.itemId && typeof line.quantity === 'number') {
              const current = receivedByItem.get(line.itemId) || 0;
              receivedByItem.set(line.itemId, current + line.quantity);
            }
          }
        }
      }

      // Also include items from the current draft receipt
      if (receipt.status === 'DRAFT' && Array.isArray(receipt.lines)) {
        for (const line of receipt.lines) {
          if (line && line.itemId && typeof line.quantity === 'number') {
            const current = receivedByItem.get(line.itemId) || 0;
            receivedByItem.set(line.itemId, current + line.quantity);
            receivedInDraft.add(line.itemId);
          }
        }
      }

      expectedItems = orderItems
        .filter((oi) => oi && oi.itemId && typeof oi.quantity === 'number')
        .map((oi) => {
          const alreadyReceived = receivedByItem.get(oi.itemId) || 0;
          const remainingQuantity = Math.max(0, oi.quantity - alreadyReceived);
          
          return {
            itemId: oi.itemId,
            itemName: oi.item?.name || 'Unknown',
            itemSku: oi.item?.sku || null,
            orderedQuantity: oi.quantity,
            alreadyReceived,
            remainingQuantity,
            unit: oi.item?.unit || null,
            productId: (oi.item as any)?.productId || null,
          };
        })
        // Filter out items that are fully received, unless they are part of the current draft (so they can be reviewed/edited)
        .filter(item => item.remainingQuantity > 0 || receivedInDraft.has(item.itemId));
    }
  }

  const canEdit = receipt.status === GoodsReceiptStatus.DRAFT;

  // Serialize Decimal types to avoid React serialization errors
  const serializedReceipt = JSON.parse(JSON.stringify(receipt));
  const serializedItems = JSON.parse(JSON.stringify(items));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ReceiptDetail 
        receipt={serializedReceipt as any} 
        items={serializedItems as any} 
        canEdit={canEdit}
        expectedItems={expectedItems}
      />
    </div>
  );
}

