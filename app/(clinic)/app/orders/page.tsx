import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { PageHeader } from '@/components/layout/PageHeader';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { parseListParams } from '@/lib/url-params';
import { selectQuickTemplates } from './_utils/quick-reorder';
import { QuickOrderButton } from './_components/quick-order-button';
import { OrdersList } from './_components/orders-list';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};

  const { page: currentPage, limit: itemsPerPage, sortBy, sortOrder } = parseListParams(params);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const [orders, totalOrders, allTemplates] = await Promise.all([
    getOrderService().findOrders(
      ctx,
      {},
      {
        pagination: { page: currentPage, limit: itemsPerPage },
        sorting: sortBy ? { sortBy, sortOrder: sortOrder as 'asc' | 'desc' } : undefined,
      }
    ),
    getOrderService().countOrders(ctx, {}),
    canManage ? getOrderService().findTemplates(ctx) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  // Fetch templates for quick reorder (only if user can manage orders)
  let quickTemplates: any[] = [];
  if (canManage) {
    quickTemplates = selectQuickTemplates(allTemplates, 5);
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Orders"
        subtitle="Track purchase orders from draft through receipt across suppliers."
        primaryAction={
          canManage ? (
            <Link href="/app/orders/new">
              <Button variant="primary">Create Order</Button>
            </Link>
          ) : undefined
        }
        secondaryAction={
          <Link href="/app/orders/templates">
            <Button variant="secondary">Order Templates</Button>
          </Link>
        }
      />

      {canManage && quickTemplates.length > 0 && (
        <QuickReorderSection templates={quickTemplates} />
      )}

      <OrdersList 
        orders={orders} 
        canManage={canManage}
        currentSort={sortBy || 'createdAt'}
        currentSortOrder={sortOrder || 'desc'}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalOrders}
        itemsPerPage={itemsPerPage}
      />
    </section>
  );
}

function QuickReorderSection({ templates }: { templates: any[] }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Reorder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reorder from your recent templates
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            >
              <div className="flex-1 min-w-0 mr-3">
                <Link
                  href={`/orders/templates/${template.id}`}
                  className="block font-medium text-slate-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400 truncate"
                >
                  {template.name}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {template.items.length} {template.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <QuickOrderButton
                templateId={template.id}
                templateName={template.name}
                size="sm"
                variant="primary"
              />
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link
            href="/app/orders/templates"
            className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            View all templates →
          </Link>
        </div>
      </div>
    </Card>
  );
}
