import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';

import { NewTemplateFormClient } from './_components/new-template-form-client';

export default async function NewTemplatePage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Access Denied</h1>
        <p className="text-sm text-slate-300">
          You do not have permission to create templates. Only staff and administrators can
          create order templates.
        </p>
      </div>
    );
  }

  const [allItems, suppliers] = await Promise.all([
    getInventoryService().findItems(ctx, {}),
    getInventoryService().getSuppliers(ctx),
  ]);

  // Transform items to match expected format
  const items = allItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    defaultSupplierId: item.defaultSupplierId,
  }));

  return <NewTemplateFormClient items={items} suppliers={suppliers} />;
}


