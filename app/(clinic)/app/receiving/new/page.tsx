import { redirect } from 'next/navigation';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService, getOrderService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { NewReceiptForm } from './_components/new-receipt-form';
import { OrderSelectionList } from './_components/order-selection-list';

export const metadata = {
  title: 'New Receipt - Venzory',
};

interface NewReceiptPageProps {
  searchParams: Promise<{ orderId?: string; noPo?: string }>;
}

export default async function NewReceiptPage({ searchParams }: NewReceiptPageProps) {
  const ctx = await buildRequestContext();
  const { orderId, noPo } = await searchParams;

  const isAdmin = ctx.role === 'ADMIN';
  const isNoPoMode = noPo === 'true';

  // 1. Order Selection Mode: No orderId provided AND not explicitly in no-PO mode
  if (!orderId && !isNoPoMode) {
    // Fetch open orders (SENT or PARTIALLY_RECEIVED)
    const orders = await getOrderService().findOrders(ctx, { 
      status: ['SENT', 'PARTIALLY_RECEIVED'],
    });
    
    return (
      <div className="mx-auto max-w-5xl p-6">
        <OrderSelectionList orders={orders} isAdmin={isAdmin} />
      </div>
    );
  }

  // 2. No-PO Mode Validation: strict Admin check
  if (isNoPoMode && !isAdmin) {
    redirect('/app/receiving/new'); // Redirect to order selection
  }

  // 3. Fetch Data for Receipt Form
  const [locations, practiceSuppliers, order] = await Promise.all([
    getInventoryService().getLocations(ctx).catch(() => []),
    getPracticeSupplierRepository().findPracticeSuppliers(ctx.practiceId).catch(() => []),
    // Fetch order details only if orderId is provided
    orderId && typeof orderId === 'string'
      ? getOrderService().getOrderById(ctx, orderId).catch(() => null)
      : Promise.resolve(null),
  ]);
  
  // Transform PracticeSuppliers
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
            : 'Ad-hoc receipt (No Purchase Order)'}
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


