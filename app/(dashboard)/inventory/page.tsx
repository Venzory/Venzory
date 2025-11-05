import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import { CreateItemForm } from './_components/create-item-form';
import { StockAdjustmentForm } from './_components/stock-adjustment-form';
import { deleteItemAction, upsertItemInlineAction } from './actions';

export default async function InventoryPage() {
  const { session, practiceId } = await requireActivePractice();

  const items = await prisma.item.findMany({
    where: { practiceId },
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

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-slate-300">
            Manage catalog items, default suppliers, and on-hand balances per location.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ItemList items={items} suppliers={suppliers} canManage={canManage} />
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

function ItemList({ items, suppliers, canManage }: {
  items: any;
  suppliers: { id: string; name: string }[];
  canManage: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
        <p className="font-medium text-slate-200">No items yet</p>
        <p className="mt-2">
          {canManage
            ? 'Add your first inventory item using the form on the right.'
            : 'An administrator needs to add items before they appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item: any) => {
        const totalQuantity = item.inventory?.reduce((sum: number, row: any) => sum + row.quantity, 0) || 0;

        return (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                  {item.sku ? (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {item.sku}
                    </span>
                  ) : null}
                </div>
                {item.description ? <p className="text-sm text-slate-300">{item.description}</p> : null}
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total on hand: <span className="text-slate-200">{totalQuantity}</span>
                </p>
                {item.defaultSupplier ? (
                  <p className="text-xs text-slate-400">
                    Default supplier:{' '}
                    <Link
                      href={`/suppliers#${item.defaultSupplier.id}`}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      {item.defaultSupplier.name}
                    </Link>
                  </p>
                ) : null}
              </div>

              {canManage ? (
                <form action={deleteItemAction.bind(null, item.id)} className="self-start">
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Locations</h3>
                {item.inventory?.length ? (
                  <ul className="space-y-1 text-sm text-slate-300">
                    {item.inventory.map((row: any) => (
                      <li key={row.locationId} className="flex items-center justify-between">
                        <span>
                          {row.location.name}
                          {row.location.code ? ` (${row.location.code})` : ''}
                        </span>
                        <span className="text-slate-100">{row.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No stock recorded yet.</p>
                )}
              </div>

              {canManage ? (
                <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">
                  <summary className="cursor-pointer text-sm font-medium text-slate-200">Edit item</summary>
                  <form action={upsertItemInlineAction} className="mt-3 space-y-3">
                    <input type="hidden" name="itemId" value={item.id} />
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`name-${item.id}`}>
                        Name
                      </label>
                      <input
                        id={`name-${item.id}`}
                        name="name"
                        defaultValue={item.name}
                        required
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400" htmlFor={`sku-${item.id}`}>
                          SKU
                        </label>
                        <input
                          id={`sku-${item.id}`}
                          name="sku"
                          defaultValue={item.sku ?? ''}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400" htmlFor={`unit-${item.id}`}>
                          Unit
                        </label>
                        <input
                          id={`unit-${item.id}`}
                          name="unit"
                          defaultValue={item.unit ?? ''}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`description-${item.id}`}>
                        Description
                      </label>
                      <textarea
                        id={`description-${item.id}`}
                        name="description"
                        rows={2}
                        defaultValue={item.description ?? ''}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`supplier-${item.id}`}>
                        Default supplier
                      </label>
                      <select
                        id={`supplier-${item.id}`}
                        name="defaultSupplierId"
                        defaultValue={item.defaultSupplier?.id ?? 'none'}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      >
                        <option value="none">No default</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    >
                      Save changes
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          </div>
        );
      })}
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

