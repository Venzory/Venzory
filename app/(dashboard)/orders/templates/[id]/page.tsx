import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole } from '@prisma/client';
import { notFound } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService, getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';

import { EditTemplateForm } from './_components/edit-template-form';
import { AddTemplateItemForm } from './_components/add-template-item-form';
import { EditTemplateItemForm } from './_components/edit-template-item-form';
import { RemoveTemplateItemButton } from './_components/remove-template-item-button';
import { DeleteTemplateButton } from './_components/delete-template-button';
import { QuickOrderButton } from '../../_components/quick-order-button';

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params;
  const { session, practiceId } = await requireActivePractice();
  const ctx = await buildRequestContext();

  let template;
  try {
    template = await getOrderService().getTemplateById(ctx, id);
  } catch (error) {
    notFound();
  }

  // Fetch available items and suppliers for the add item form
  const [itemsResult, practiceSuppliers] = await Promise.all([
    getInventoryService().findItems(ctx, {}, { limit: 10000 }),
    getPracticeSupplierRepository().findPracticeSuppliers(practiceId),
  ]);
  const availableItems = itemsResult.items;
  
  // Transform PracticeSuppliers to match expected format
  const suppliers = practiceSuppliers.map(ps => ({
    id: ps.id,
    name: ps.customLabel || ps.globalSupplier?.name || 'Unknown Supplier',
  }));

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  // Transform items to match expected format
  const allItems = availableItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/orders/templates"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Templates
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{template.name}</h1>
          {template.description ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">{template.description}</p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Quick order creates one draft per supplier
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 pt-1">
            <span>
              Created by {template.createdBy.name || template.createdBy.email}
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>
              {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <>
              <DeleteTemplateButton templateId={template.id} />
              <QuickOrderButton
                templateId={template.id}
                templateName={template.name}
                size="md"
                variant="primary"
              />
              <Link href={`/orders/templates/${template.id}/preview`}>
                <Button variant="secondary" size="md">
                  Review & create
                </Button>
              </Link>
            </>
          ) : (
            <Link href={`/orders/templates/${template.id}/preview`}>
              <Button variant="primary" size="md">
                View Details
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Edit Template Details */}
      {canManage ? (
        <EditTemplateForm
          templateId={template.id}
          currentName={template.name}
          currentDescription={template.description}
        />
      ) : null}

      {/* Template Items */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/60">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Template Items</h2>
          <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
            {template.items.length} {template.items.length === 1 ? 'item' : 'items'} in this
            template
          </p>
        </div>

        {template.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No items in this template yet</p>
            {canManage ? (
              <p className="mt-2">Add items using the form below</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Default Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Supplier
                  </th>
                  {canManage ? (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {template.items?.map((templateItem: any) => (
                  <tr key={templateItem.id}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {templateItem.item.name}
                        </span>
                        {templateItem.item.sku ? (
                          <span className="text-xs text-slate-500 dark:text-slate-500">{templateItem.item.sku}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <EditTemplateItemForm
                          templateItemId={templateItem.id}
                          currentQuantity={templateItem.defaultQuantity}
                          currentSupplierId={templateItem.supplierId}
                          suppliers={suppliers}
                          itemUnit={templateItem.item.unit}
                        />
                      ) : (
                        <span className="text-slate-900 dark:text-slate-200">
                          {templateItem.defaultQuantity}
                          {templateItem.item.unit ? (
                            <span className="ml-1 text-slate-500 dark:text-slate-500">{templateItem.item.unit}</span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {templateItem.supplier ? (
                        <span className="text-slate-700 dark:text-slate-300">{templateItem.supplier.name}</span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-500">No supplier</span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <RemoveTemplateItemButton templateItemId={templateItem.id} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Item Form */}
        {canManage ? (
          <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <AddTemplateItemForm
              templateId={template.id}
              items={allItems.filter(
                (item) => !template.items?.some((ti: any) => ti.itemId === item.id)
              )}
              suppliers={suppliers}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

