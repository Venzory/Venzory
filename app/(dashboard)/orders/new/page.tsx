import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import { NewOrderFormClient } from './_components/new-order-form-client';

export default async function NewOrderPage() {
  const { session, practiceId } = await requireActivePractice();

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

  const [suppliers, items] = await Promise.all([
    prisma.supplier.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.item.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        defaultSupplierId: true,
        supplierItems: {
          select: {
            supplierId: true,
            unitPrice: true,
          },
        },
      },
    }),
  ]);

  return <NewOrderFormClient suppliers={suppliers} items={items} />;
}
