import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import { NewTemplateFormClient } from './_components/new-template-form-client';

export default async function NewTemplatePage() {
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
          You do not have permission to create templates. Only staff and administrators can
          create order templates.
        </p>
      </div>
    );
  }

  const [items, suppliers] = await Promise.all([
    prisma.item.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        defaultSupplierId: true,
      },
    }),
    prisma.supplier.findMany({
      where: { practiceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return <NewTemplateFormClient items={items} suppliers={suppliers} />;
}

