import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService, getOrderService } from '@/src/services';
import { NewReceiptForm } from './_components/new-receipt-form';

export const metadata = {
  title: 'New Receipt - Remcura',
};

interface NewReceiptPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function NewReceiptPage({ searchParams }: NewReceiptPageProps) {
  const ctx = await buildRequestContext();
  const { orderId } = await searchParams;

  // Fetch locations and suppliers for form dropdowns
  const [locations, suppliers, order] = await Promise.all([
    getInventoryService().getLocations(ctx),
    getInventoryService().getSuppliers(ctx),
    // Fetch order details if orderId is provided
    orderId
      ? getOrderService().getOrderById(ctx, orderId).catch(() => null)
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
            ? `Receiving order ${order.reference || `#${order.id.slice(0, 8)}`} from ${order.supplier?.name || 'Unknown'}`
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
          supplierName: order.supplier?.name || 'Unknown',
          items: (order.items || []).map(item => ({
            id: item.id,
            itemId: item.itemId,
            itemName: item.item?.name || 'Unknown',
            itemSku: item.item?.sku || null,
            quantity: item.quantity,
          })),
        } : undefined}
      />
    </div>
  );
}


