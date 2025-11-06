import { PracticeRole } from '@prisma/client';
import { notFound } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import { TemplatePreviewClient } from './_components/template-preview-client';

interface TemplatePreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePreviewPage({ params }: TemplatePreviewPageProps) {
  const { id } = await params;
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
          You do not have permission to create orders. Only staff and administrators can
          create purchase orders.
        </p>
      </div>
    );
  }

  const template = await prisma.orderTemplate.findUnique({
    where: { id, practiceId },
    include: {
      items: {
        include: {
          item: {
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
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    notFound();
  }

  const allSuppliers = await prisma.supplier.findMany({
    where: { practiceId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const allItems = await prisma.item.findMany({
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
  });

  return (
    <TemplatePreviewClient
      template={template}
      allSuppliers={allSuppliers}
      allItems={allItems}
    />
  );
}

