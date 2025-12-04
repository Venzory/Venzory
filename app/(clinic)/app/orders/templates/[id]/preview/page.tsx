import { PracticeRole } from '@prisma/client';
import { notFound } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService, getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
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

  const [practiceSuppliers, itemsResult] = await Promise.all([
    getPracticeSupplierRepository().findPracticeSuppliers(practiceId),
    getInventoryService().findItems(ctx, {}, { limit: 10000 }),
  ]);
  
  // Transform PracticeSuppliers to match expected format
  const allSuppliers = practiceSuppliers.map(ps => ({
    id: ps.id,
    name: ps.customLabel || ps.globalSupplier?.name || 'Unknown Supplier',
  }));
  const itemsList = itemsResult.items;

  // Transform items to match expected format
  const allItems = itemsList.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    defaultPracticeSupplierId: item.defaultPracticeSupplierId,
    practiceSupplierItems: item.practiceSupplierItems?.map((si: any) => ({
      practiceSupplierId: si.practiceSupplierId,
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

