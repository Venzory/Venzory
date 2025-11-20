import { redirect } from 'next/navigation';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService, getOrderService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { NewReceiptForm } from './_components/new-receipt-form';

export const metadata = {
  title: 'New Receipt - Venzory',
};

interface NewReceiptPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function NewReceiptPage({ searchParams }: NewReceiptPageProps) {
  const ctx = await buildRequestContext();
  const { orderId } = await searchParams;

  // Check role permissions
  const isAdmin = ctx.role === 'ADMIN';
  
  // If not linking to an order, only admins can proceed
  if (!orderId && !isAdmin) {
    redirect('/receiving');
  }

  // Fetch locations and suppliers for form dropdowns
  const [locations, practiceSuppliers, order] = await Promise.all([
    getInventoryService().getLocations(ctx).catch(() => []),
    getPracticeSupplierRepository().findPracticeSuppliers(ctx.practiceId).catch(() => []),
    // Fetch order details if orderId is provided
    orderId && typeof orderId === 'string'
      ? getOrderService().getOrderById(ctx, orderId).catch(() => null)
      : Promise.resolve(null),
  ]);
  
  // Transform PracticeSuppliers to match expected format
  const suppliers = practiceSuppliers.map(ps => ({
    id: ps.id,
    name: ps.customLabel || ps.globalSupplier?.name || 'Unknown Supplier',
  }));

  // Get supplier name from order
  let supplierName = 'Unknown';
  if (order?.practiceSupplier) {
    supplierName = order.practiceSupplier.customLabel || order.practiceSupplier.globalSupplier?.name || 'Unknown';
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          New Goods Receipt
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {order
            ? `Receiving order ${order.reference || `#${order.id.slice(0, 8)}`} from ${supplierName}`
            : 'Start a new receipt to track incoming deliveries'}
        </p>
      </div>

      <NewReceiptForm 
        locations={locations} 
        suppliers={suppliers} 
        isAdmin={isAdmin}
        order={order ? {
          id: order.id,
          reference: order.reference,
          supplierId: order.practiceSupplierId,
          supplierName,
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


