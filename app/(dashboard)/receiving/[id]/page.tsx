import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ReceiptDetail } from './_components/receipt-detail';
import { GoodsReceiptStatus } from '@prisma/client';

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { practiceId } = await requireActivePractice();
  const { id } = await params;

  const receipt = await prisma.goodsReceipt.findUnique({
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
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          reference: true,
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

  if (!receipt) {
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

  if (receipt.order) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId: receipt.order.id,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
    });

    // Get all OTHER confirmed receipts for this order (not including the current draft)
    const previousReceipts = await prisma.goodsReceipt.findMany({
      where: {
        orderId: receipt.order.id,
        status: 'CONFIRMED',
        id: { not: receipt.id },
      },
      include: {
        lines: {
          select: {
            itemId: true,
            quantity: true,
          },
        },
      },
    });

    // Calculate total received per item from previous receipts
    const receivedByItem = new Map<string, number>();
    for (const prevReceipt of previousReceipts) {
      for (const line of prevReceipt.lines) {
        const current = receivedByItem.get(line.itemId) || 0;
        receivedByItem.set(line.itemId, current + line.quantity);
      }
    }

    expectedItems = orderItems.map((oi) => {
      const alreadyReceived = receivedByItem.get(oi.item.id) || 0;
      const remainingQuantity = Math.max(0, oi.quantity - alreadyReceived);
      
      return {
        itemId: oi.item.id,
        itemName: oi.item.name,
        itemSku: oi.item.sku,
        orderedQuantity: oi.quantity,
        alreadyReceived,
        remainingQuantity,
        unit: oi.item.unit,
      };
    });

    // Filter out items that are fully received (optional - you might want to show them as "Already Received")
    // expectedItems = expectedItems.filter(item => item.remainingQuantity > 0);
  }

  const canEdit = receipt.status === GoodsReceiptStatus.DRAFT;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ReceiptDetail 
        receipt={receipt} 
        items={items} 
        canEdit={canEdit}
        expectedItems={expectedItems}
      />
    </div>
  );
}

