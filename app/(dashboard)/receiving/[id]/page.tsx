import { buildRequestContext } from '@/src/lib/context/context-builder';
import { ReceivingRepository } from '@/src/repositories/receiving';
import { InventoryRepository } from '@/src/repositories/inventory';
import { OrderRepository } from '@/src/repositories/orders';
import { notFound } from 'next/navigation';
import { ReceiptDetail } from './_components/receipt-detail';
import { GoodsReceiptStatus } from '@prisma/client';

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const ctx = await buildRequestContext();
  const { id } = await params;

  const receivingRepo = new ReceivingRepository();
  const inventoryRepo = new InventoryRepository();
  const orderRepo = new OrderRepository();

  // Fetch the receipt
  const receipt = await receivingRepo.findGoodsReceiptById(id, ctx.practiceId);

  if (!receipt) {
    notFound();
  }

  // Fetch all items for adding manually
  const items = await inventoryRepo.findItems(ctx.practiceId);

  // If linked to an order, fetch expected items and calculate what's already been received
  let expectedItems: Array<{
    itemId: string;
    itemName: string;
    itemSku: string | null;
    orderedQuantity: number;
    alreadyReceived: number;
    remainingQuantity: number;
    unit: string | null;
  }> | null = null;

  if (receipt.orderId) {
    // Fetch the order with its items
    const order = await orderRepo.findOrderById(receipt.orderId, ctx.practiceId);
    const orderItems = order.items || [];

    // Get all confirmed receipts for this order
    const confirmedReceipts = await receivingRepo.findGoodsReceipts(ctx.practiceId, {
      orderId: receipt.orderId,
      status: 'CONFIRMED',
    });

    // Calculate what's already been received from confirmed receipts
    const receivedByItem = new Map<string, number>();
    for (const prevReceipt of confirmedReceipts) {
      for (const line of prevReceipt.lines || []) {
        const current = receivedByItem.get(line.itemId) || 0;
        receivedByItem.set(line.itemId, current + line.quantity);
      }
    }

    // Also include items from the current draft receipt
    if (receipt.status === 'DRAFT') {
      for (const line of receipt.lines || []) {
        const current = receivedByItem.get(line.itemId) || 0;
        receivedByItem.set(line.itemId, current + line.quantity);
      }
    }

    expectedItems = orderItems.map((oi) => {
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
      };
    });

    // Filter out items that are fully received to avoid showing ghost forms
    expectedItems = expectedItems.filter(item => item.remainingQuantity > 0);
  }

  const canEdit = receipt.status === GoodsReceiptStatus.DRAFT;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ReceiptDetail 
        receipt={receipt as any} 
        items={items as any} 
        canEdit={canEdit}
        expectedItems={expectedItems}
      />
    </div>
  );
}

