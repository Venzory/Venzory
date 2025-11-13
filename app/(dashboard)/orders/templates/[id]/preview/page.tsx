import { PracticeRole } from '@prisma/client';
import { notFound } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService, getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';

import { TemplatePreviewClient } from './_components/template-preview-client';

interface TemplatePreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePreviewPage({ params }: TemplatePreviewPageProps) {
  const { id } = await params;
  const { session, practiceId } = await requireActivePractice();
  const ctx = await buildRequestContext();

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
          You do not have permission to create orders. Only staff and administrators can
          create purchase orders.
        </p>
      </div>
    );
  }

  let template;
  try {
    template = await getOrderService().getTemplateById(ctx, id);
  } catch (error) {
    notFound();
  }

  const [allSuppliers, itemsResult] = await Promise.all([
    getInventoryService().getSuppliers(ctx),
    getInventoryService().findItems(ctx, {}, { limit: 10000 }),
  ]);
  const itemsList = itemsResult.items;

  // Transform items to match expected format
  const allItems = itemsList.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    defaultSupplierId: item.defaultSupplierId,
    supplierItems: item.supplierItems?.map((si: any) => ({
      supplierId: si.supplierId,
      unitPrice: si.unitPrice,
    })) || [],
  }));

  return (
    <TemplatePreviewClient
      template={template}
      allSuppliers={allSuppliers}
      allItems={allItems}
    />
  );
}

