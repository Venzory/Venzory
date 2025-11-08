import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewReceiptForm } from './_components/new-receipt-form';

export const metadata = {
  title: 'New Receipt - Remcura',
};

interface NewReceiptPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function NewReceiptPage({ searchParams }: NewReceiptPageProps) {
  const { practiceId } = await requireActivePractice();
  const { orderId } = await searchParams;

  // Fetch locations and suppliers for form dropdowns
  const [locations, suppliers, order] = await Promise.all([
    prisma.location.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.supplier.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    }),
    // Fetch order details if orderId is provided
    orderId
      ? prisma.order.findUnique({
          where: { id: orderId, practiceId },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          New Goods Receipt
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {order
            ? `Receiving order ${order.reference || `#${order.id.slice(0, 8)}`} from ${order.supplier.name}`
            : 'Start a new receipt to track incoming deliveries'}
        </p>
      </div>

      <NewReceiptForm 
        locations={locations} 
        suppliers={suppliers} 
        order={order ? {
          id: order.id,
          reference: order.reference,
          supplierId: order.supplierId,
          supplierName: order.supplier.name,
          items: order.items.map(item => ({
            id: item.id,
            itemId: item.item.id,
            itemName: item.item.name,
            itemSku: item.item.sku,
            quantity: item.quantity,
          })),
        } : undefined}
      />
    </div>
  );
}

