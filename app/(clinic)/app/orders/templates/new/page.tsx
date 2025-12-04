import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You do not have permission to create templates. Only staff and administrators can
          create order templates.
        </p>
      </div>
    );
  }

  const [itemsResult, practiceSuppliers] = await Promise.all([
    getInventoryService().findItems(ctx, {}, { limit: 10000 }),
    getPracticeSupplierRepository().findPracticeSuppliers(practiceId),
  ]);
  const allItems = itemsResult.items;
  
  // Transform PracticeSuppliers to match expected format
  const suppliers = practiceSuppliers.map(ps => ({
    id: ps.id,
    name: ps.customLabel || ps.globalSupplier?.name || 'Unknown Supplier',
    isPreferred: ps.isPreferred,
    isBlocked: ps.isBlocked,
    accountNumber: ps.accountNumber,
  }));

  // Transform items to match expected format
  const items = allItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
                      defaultPracticeSupplierId: item.defaultPracticeSupplierId,
  }));

  return <NewTemplateFormClient items={items} suppliers={suppliers} />;
}


