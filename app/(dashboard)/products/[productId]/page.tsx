import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';
import { format } from 'date-fns';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageProducts, canViewProductPricing } from '@/lib/rbac';

import { Gs1StatusBadge } from '../_components/gs1-status-badge';
import { IntegrationTypeBadge } from '../_components/integration-type-badge';
import { deleteProductAction, triggerGs1LookupAction } from '../actions';

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = await params;
  const { session, practiceId } = await requireActivePractice();

  // Fetch product with supplier catalogs and items for this practice
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      supplierCatalogs: {
        where: {
          supplier: { practiceId },
        },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
        orderBy: { supplier: { name: 'asc' } },
      },
      items: {
        where: { practiceId },
        include: {
          inventory: {
            select: {
              quantity: true,
              reorderPoint: true,
              location: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const canManage = canManageProducts({
    memberships: session.user.memberships,
    practiceId,
  });

  const canViewPricing = canViewProductPricing({
    memberships: session.user.memberships,
    practiceId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Products
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{product.name}</h1>
          {product.brand ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">by {product.brand}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          {canManage && product.gtin ? (
            <form action={triggerGs1LookupAction.bind(null, product.id)}>
              <button
                type="submit"
                className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-900/20"
              >
                Refresh GS1 Data
              </button>
            </form>
          ) : null}
          {canManage && product.items.length === 0 ? (
            <form action={deleteProductAction.bind(null, product.id)}>
              <button
                type="submit"
                className="rounded-lg border border-rose-600 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-900/20"
              >
                Delete Product
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* Product Information Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Product Information</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GTIN / Barcode</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-200">
              {product.gtin || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GS1 Status</dt>
            <dd className="mt-1">
              <Gs1StatusBadge status={product.gs1VerificationStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Brand / Manufacturer</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
              {product.brand || '-'}
            </dd>
          </div>
          {product.gs1VerifiedAt ? (
            <div>
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GS1 Verified</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
                {format(product.gs1VerifiedAt, 'MMM d, yyyy h:mm a')}
              </dd>
            </div>
          ) : null}
          {product.description ? (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</dt>
              <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {product.description}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Created</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
              {format(product.createdAt, 'MMM d, yyyy h:mm a')}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Updated</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
              {format(product.updatedAt, 'MMM d, yyyy h:mm a')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Supplier Offers */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Supplier Offers</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Suppliers in your practice offering this product
          </p>
        </div>

        {product.supplierCatalogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No supplier offers yet</p>
            <p className="mt-2">
              This product is not currently offered by any suppliers in your practice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Supplier SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Integration
                  </th>
                  {canViewPricing ? (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Min Qty
                      </th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Last Sync
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {product.supplierCatalogs.map((catalog) => {
                  const unitPrice = catalog.unitPrice
                    ? parseFloat(catalog.unitPrice.toString())
                    : null;

                  return (
                    <tr key={catalog.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/suppliers#${catalog.supplier.id}`}
                          className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          {catalog.supplier.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {catalog.supplierSku || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <IntegrationTypeBadge type={catalog.integrationType} />
                      </td>
                      {canViewPricing ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-slate-900 dark:text-slate-200">
                              {unitPrice ? `${catalog.currency} ${unitPrice.toFixed(2)}` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-700 dark:text-slate-300">
                              {catalog.minOrderQty || 1}
                            </span>
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {catalog.lastSyncAt
                            ? format(catalog.lastSyncAt, 'MMM d, yyyy')
                            : 'Never'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Practice Usage - Items using this product */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Practice Usage</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Inventory items in your practice using this product
          </p>
        </div>

        {product.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No items yet</p>
            <p className="mt-2">
              This product is not yet used in any inventory items in your practice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Total Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {product.items.map((item) => {
                  const totalStock = item.inventory.reduce(
                    (sum, inv) => sum + inv.quantity,
                    0
                  );
                  const lowStockLocations = item.inventory.filter(
                    (inv) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
                  );
                  const isLowStock = lowStockLocations.length > 0;

                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLowStock ? (
                          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-block rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory#${item.id}`}
                          className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

