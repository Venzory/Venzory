import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { getSupplierCorrectionRepository } from '@/src/repositories/suppliers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Package } from 'lucide-react';
import { SupplierItemsClient } from './_components/supplier-items-client';

export default async function SupplierItemsPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You need supplier portal access to view this page.
        </p>
      </div>
    );
  }

  // Fetch supplier items with product info and corrections
  const supplierItems = await prisma.supplierItem.findMany({
    where: {
      globalSupplierId: supplierContext.supplierId,
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          gtin: true,
          brand: true,
        },
      },
      corrections: {
        where: {
          status: {
            in: ['DRAFT', 'PENDING'],
          },
        },
        select: {
          id: true,
          status: true,
          proposedData: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: [
      { updatedAt: 'desc' },
    ],
  });

  // Get correction stats
  const correctionRepo = getSupplierCorrectionRepository();
  const correctionStats = await correctionRepo.countByStatus(supplierContext.supplierId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
          <Package className="h-6 w-6 text-white" />
        </div>
        <PageHeader
          title="My Items"
          subtitle="View and propose corrections to your product catalog"
        />
      </div>

      {/* Client Component for interactive features */}
      <SupplierItemsClient
        items={supplierItems}
        stats={correctionStats}
      />
    </div>
  );
}

