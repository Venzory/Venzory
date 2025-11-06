import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

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
  const params = searchParams ? await searchParams : {};
  
  const { q, location, supplier } = params;
  
  // Build filter conditions
  const filterConditions: any[] = [];
  
  // Text search on name and SKU
  if (q && q.trim()) {
    filterConditions.push({
      OR: [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { sku: { contains: q.trim(), mode: 'insensitive' } },
      ],
    });
  }
  
  // Location filter - items with stock in selected location
  if (location) {
    filterConditions.push({
      inventory: {
        some: { locationId: location },
      },
    });
  }
  
  // Supplier filter
  if (supplier) {
    filterConditions.push({
      defaultSupplierId: supplier,
    });
  }

  const items = await prisma.item.findMany({
    where: {
      practiceId,
      ...(filterConditions.length > 0 ? { AND: filterConditions } : {}),
    },
    include: {
      defaultSupplier: { select: { id: true, name: true } },
      inventory: {
        include: {
          location: { select: { id: true, name: true, code: true } },
        },
        orderBy: { location: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate low-stock information for each item
  const lowStockInfo: Record<string, { isLowStock: boolean; suggestedQuantity: number; lowStockLocations: string[] }> = {};
  
  for (const item of items) {
    const lowStockLocations = item.inventory.filter(
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
    prisma.supplier.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
    prisma.stockAdjustment.findMany({
      where: { practiceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        item: { select: { id: true, name: true, sku: true } },
        location: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(q || location || supplier);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Inventory</h1>
            <p className="text-sm text-slate-300">
              Manage catalog items, default suppliers, and on-hand balances per location.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/orders/new"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Create Order
            </Link>
          ) : null}
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
            items={items}
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

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {canManage ? (
          <StockAdjustmentForm
            items={items.map((item) => ({ id: item.id, name: item.name, sku: item.sku }))}
            locations={locations}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <h2 className="text-lg font-semibold text-white">No adjustment permissions</h2>
            <p className="mt-2">
              Only staff and administrators can record stock movements. Contact a practice admin for access.
            </p>
          </div>
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-white">Recent adjustments</h2>
        <p className="mt-2 text-sm text-slate-400">No stock adjustments recorded yet.</p>
        {canManage ? (
          <p className="mt-4 text-xs text-slate-500">
            Tip: record adjustments when receiving goods, auditing counts, or writing off waste.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Recent adjustments</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-200">
        {adjustments.map((adjustment: any) => (
          <li key={adjustment.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {formatDistanceToNow(adjustment.createdAt, { addSuffix: true })}
              </span>
              <span>{adjustment.reason ?? 'No reason provided'}</span>
            </div>
            <p className="mt-2 font-medium text-slate-100">
              {adjustment.quantity > 0 ? '+' : ''}
              {adjustment.quantity}{' '}
              <span className="text-slate-300">{adjustment.item.name}</span>
            </p>
            <p className="text-xs text-slate-400">
              Location: {adjustment.location.name}
              {adjustment.location.code ? ` (${adjustment.location.code})` : ''}
            </p>
            <p className="text-xs text-slate-500">
              By {adjustment.createdBy?.name ?? adjustment.createdBy?.email ?? 'Unknown'}
            </p>
            {adjustment.note ? <p className="mt-1 text-xs text-slate-300">{adjustment.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

