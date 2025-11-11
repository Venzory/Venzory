import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { CreateItemForm } from './_components/create-item-form';
import { StockAdjustmentForm } from './_components/stock-adjustment-form';
import { SearchFilters } from './_components/search-filters';
import { LowStockItemList } from './_components/low-stock-item-list';
import { deleteItemAction, upsertItemInlineAction } from './actions';

interface InventoryPageProps {
  searchParams?: Promise<{
    q?: string;
    location?: string;
    supplier?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  
  const { q, location, supplier } = params;

  // Fetch items using InventoryService with filters
  const items = await getInventoryService().findItems(ctx, {
    search: q?.trim(),
    locationId: location,
    supplierId: supplier,
  });

  // Transform items to convert Prisma Decimal to number for client component serialization
  const transformedItems = items.map(item => ({
    ...item,
    supplierItems: item.supplierItems?.map(si => ({
      ...si,
      unitPrice: si.unitPrice ? Number(si.unitPrice) : null,
    })) || [],
  }));

  // Calculate low-stock information for each item
  const lowStockInfo: Record<string, { isLowStock: boolean; suggestedQuantity: number; lowStockLocations: string[] }> = {};
  
  for (const item of transformedItems) {
    const lowStockLocations = (item.inventory || []).filter(
      (inv) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
    );
    
    const isLowStock = lowStockLocations.length > 0;
    
    const suggestedQuantity = lowStockLocations.reduce((sum, inv) => {
      return sum + (inv.reorderQuantity || inv.reorderPoint || 1);
    }, 0);
    
    lowStockInfo[item.id] = {
      isLowStock,
      suggestedQuantity,
      lowStockLocations: lowStockLocations.map(loc => loc.locationId),
    };
  }

  const [suppliers, locations, adjustments] = await Promise.all([
    getInventoryService().getSuppliers(ctx),
    getInventoryService().getLocations(ctx),
    getInventoryService().getRecentAdjustments(ctx, 10),
  ]);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(q || location || supplier);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Inventory</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Track stock levels per location and manage inventory adjustments.
            </p>
          </div>
          {canManage && (
            <Link href="/orders/new">
              <Button variant="primary">Create Order</Button>
            </Link>
          )}
        </div>

        <SearchFilters
          initialSearch={q}
          initialLocation={location}
          initialSupplier={supplier}
          locations={locations}
          suppliers={suppliers}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <LowStockItemList
            items={transformedItems as any}
            suppliers={suppliers}
            canManage={canManage}
            hasActiveFilters={hasActiveFilters}
            lowStockInfo={lowStockInfo}
            deleteItemAction={deleteItemAction}
            upsertItemInlineAction={upsertItemInlineAction}
          />
          {canManage ? <CreateItemForm suppliers={suppliers} /> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] mt-8">
        {canManage ? (
          <StockAdjustmentForm
            items={transformedItems.map((item) => ({ id: item.id, name: item.name, sku: item.sku }))}
            locations={locations}
          />
        ) : (
          <Card className="text-sm text-slate-700 dark:text-slate-300">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No adjustment permissions</h2>
            <p className="mt-2">
              Only staff and administrators can record stock movements. Contact a practice admin for access.
            </p>
          </Card>
        )}

        <RecentAdjustments adjustments={adjustments} canManage={canManage} />
      </section>
    </div>
  );
}


function RecentAdjustments({
  adjustments,
  canManage,
}: {
  adjustments: any;
  canManage: boolean;
}) {
  if (adjustments.length === 0) {
    return (
      <Card className="text-sm text-slate-700 dark:text-slate-300">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent adjustments</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No stock adjustments recorded yet.</p>
        {canManage ? (
          <p className="mt-4 text-xs text-slate-500">
            Tip: record adjustments when receiving goods, auditing counts, or writing off waste.
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent adjustments</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-900 dark:text-slate-200">
        {adjustments.map((adjustment: any) => (
          <li key={adjustment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {formatDistanceToNow(adjustment.createdAt, { addSuffix: true })}
              </span>
              <span>{adjustment.reason ?? 'No reason provided'}</span>
            </div>
            <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
              {adjustment.quantity > 0 ? '+' : ''}
              {adjustment.quantity}{' '}
              <span className="text-slate-700 dark:text-slate-300">{adjustment.item.name}</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Location: {adjustment.location.name}
              {adjustment.location.code ? ` (${adjustment.location.code})` : ''}
            </p>
            <p className="text-xs text-slate-500">
              By {adjustment.createdBy?.name ?? adjustment.createdBy?.email ?? 'Unknown'}
            </p>
            {adjustment.note ? <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{adjustment.note}</p> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}


