import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';

import { NewOrderFormClient } from './_components/new-order-form-client';

export default async function NewOrderPage() {
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
          You do not have permission to create orders. Only staff and administrators can create
          purchase orders.
        </p>
      </div>
    );
  }

  // Fetch PracticeSuppliers (excludes blocked by default)
  const [practiceSuppliers, allItems] = await Promise.all([
    getPracticeSupplierRepository().findPracticeSuppliers(practiceId, {
      includeBlocked: false,
    }),
    getInventoryService().findItems(ctx, {}),
  ]);

  // Transform items to match expected format
  const items = allItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    defaultSupplierId: item.defaultSupplierId,
    defaultPracticeSupplierId: item.defaultPracticeSupplierId,
    supplierItems: item.supplierItems?.map((si: any) => ({
      supplierId: si.supplierId,
      practiceSupplierId: si.practiceSupplierId,
      unitPrice: si.unitPrice ? parseFloat(si.unitPrice.toString()) : null,
    })) || [],
  }));

  return <NewOrderFormClient practiceSuppliers={practiceSuppliers} items={items} />;
}

