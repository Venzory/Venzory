import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { decimalToNumber } from '@/lib/prisma-transforms';

import { NewOrderFormClient } from './_components/new-order-form-client';

interface NewOrderPageProps {
  searchParams: Promise<{ supplierId?: string }>;
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const { supplierId } = await searchParams;
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
  const [practiceSuppliers, itemsResult] = await Promise.all([
    getPracticeSupplierRepository().findPracticeSuppliers(practiceId, {
      includeBlocked: false,
    }),
    getInventoryService().findItems(ctx, {}, { limit: 10000 }),
  ]);

  // Transform items to match expected format
  const items = itemsResult.items.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    defaultPracticeSupplierId: item.defaultPracticeSupplierId,
    practiceSupplierItems: item.practiceSupplierItems?.map((si: any) => ({
      practiceSupplierId: si.practiceSupplierId,
      unitPrice: decimalToNumber(si.unitPrice),
    })) || [],
  }));

  // Validate pre-selected supplier ID if provided
  const preSelectedSupplierId = supplierId 
    ? practiceSuppliers.find(ps => ps.id === supplierId)?.id 
    : undefined;

  return <NewOrderFormClient 
    practiceSuppliers={practiceSuppliers} 
    items={items} 
    preSelectedSupplierId={preSelectedSupplierId}
  />;
}

