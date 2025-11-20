import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { ReorderList } from './_components/reorder-list';
import { hasRole } from '@/lib/rbac';
import { PracticeRole } from '@prisma/client';

export default async function ReorderPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  const items = await getInventoryService().getLowStockItems(ctx);
  
  const canOrder = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reorder Suggestions</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Items below their minimum stock level. Review and generate draft orders.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-200">
        <p>
          <strong>Advisory View:</strong> Suggested quantities are calculated based on Max Stock (if set) or Reorder Quantity.
        </p>
      </div>

      <ReorderList items={items} canOrder={canOrder} />
    </div>
  );
}

