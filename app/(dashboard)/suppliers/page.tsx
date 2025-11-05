import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import { CreateSupplierForm } from './_components/create-supplier-form';
import { deleteSupplierAction, upsertSupplierInlineAction } from '../inventory/actions';

export default async function SuppliersPage() {
  const { session, practiceId } = await requireActivePractice();

  const suppliers = await prisma.supplier.findMany({
    where: { practiceId },
    orderBy: { name: 'asc' },
    include: {
      defaultItems: {
        select: { id: true, name: true, sku: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Suppliers</h1>
        <p className="text-sm text-slate-300">
          Store supplier contacts, payment notes, and link their preferred catalog items.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SupplierList suppliers={suppliers} canManage={canManage} />
        {canManage ? (
          <CreateSupplierForm />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <h2 className="text-lg font-semibold text-white">View only</h2>
            <p className="mt-2">
              Supplier details are visible, but only staff and administrators can edit or add records.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SupplierList({
  suppliers,
  canManage,
}: {
  suppliers: any;
  canManage: boolean;
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
        <p className="font-medium text-slate-200">No suppliers yet</p>
        <p className="mt-2">
          {canManage
            ? 'Add your first supplier using the form on the right.'
            : 'A teammate with edit access needs to add suppliers.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suppliers.map((supplier: any) => (
        <div key={supplier.id} id={supplier.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">{supplier.name}</h2>
              <div className="text-sm text-slate-300">
                {supplier.email ? (
                  <p>
                    Email:{' '}
                    <a href={`mailto:${supplier.email}`} className="text-sky-400 hover:text-sky-300">
                      {supplier.email}
                    </a>
                  </p>
                ) : null}
                {supplier.phone ? (
                  <p>
                    Phone:{' '}
                    <a href={`tel:${supplier.phone}`} className="text-sky-400 hover:text-sky-300">
                      {supplier.phone}
                    </a>
                  </p>
                ) : null}
                {supplier.website ? (
                  <p>
                    Website:{' '}
                    <a href={supplier.website} className="text-sky-400 hover:text-sky-300" target="_blank" rel="noreferrer">
                      {supplier.website}
                    </a>
                  </p>
                ) : null}
              </div>
              {supplier.notes ? <p className="text-sm text-slate-400">{supplier.notes}</p> : null}
            </div>

            {canManage ? (
              <form action={deleteSupplierAction.bind(null, supplier.id)} className="self-start">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                >
                  Delete
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Default items</h3>
              {supplier.defaultItems.length ? (
                <ul className="space-y-1 text-sm text-slate-300">
                  {supplier.defaultItems.map((item: any) => (
                    <li key={item.id} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.sku ? <span className="text-xs text-slate-500">{item.sku}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No catalog items linked yet.</p>
              )}
            </div>

            {canManage ? (
              <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">
                <summary className="cursor-pointer text-sm font-medium text-slate-200">Edit supplier</summary>
                <form action={upsertSupplierInlineAction} className="mt-3 space-y-3">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400" htmlFor={`supplier-name-${supplier.id}`}>
                      Name
                    </label>
                    <input
                      id={`supplier-name-${supplier.id}`}
                      name="name"
                      defaultValue={supplier.name}
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`supplier-email-${supplier.id}`}>
                        Email
                      </label>
                      <input
                        id={`supplier-email-${supplier.id}`}
                        name="email"
                        type="email"
                        defaultValue={supplier.email ?? ''}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`supplier-phone-${supplier.id}`}>
                        Phone
                      </label>
                      <input
                        id={`supplier-phone-${supplier.id}`}
                        name="phone"
                        defaultValue={supplier.phone ?? ''}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400" htmlFor={`supplier-website-${supplier.id}`}>
                      Website
                    </label>
                    <input
                      id={`supplier-website-${supplier.id}`}
                      name="website"
                      type="url"
                      defaultValue={supplier.website ?? ''}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400" htmlFor={`supplier-notes-${supplier.id}`}>
                      Notes
                    </label>
                    <textarea
                      id={`supplier-notes-${supplier.id}`}
                      name="notes"
                      rows={2}
                      defaultValue={supplier.notes ?? ''}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
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
      ))}
    </div>
  );
}

