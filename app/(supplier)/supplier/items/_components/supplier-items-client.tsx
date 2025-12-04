'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SupplierItem, CorrectionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { CorrectionStatusPanel } from './correction-status-panel';
import { EditableItemTable } from './editable-item-table';
import { SubmitCorrectionsDialog } from './submit-corrections-dialog';

type SupplierItemWithProduct = SupplierItem & {
  product: {
    id: string;
    name: string;
    gtin: string | null;
    brand: string | null;
  };
  corrections?: Array<{
    id: string;
    status: CorrectionStatus;
    proposedData: Prisma.JsonValue;
  }>;
};

interface SupplierItemsClientProps {
  items: SupplierItemWithProduct[];
  stats: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export function SupplierItemsClient({ items, stats }: SupplierItemsClientProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setIsDialogOpen(false);
    router.refresh();
  }, [router]);

  return (
    <>
      {/* Correction Status Panel */}
      <CorrectionStatusPanel
        stats={stats}
        onSubmit={stats.draft > 0 ? handleOpenDialog : undefined}
      />

      {/* Items Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Product Catalog
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Click the edit button to propose changes. Changes are saved as drafts until you submit them for review.
        </p>
        <EditableItemTable items={items} />
      </div>

      {/* Submit Dialog */}
      <SubmitCorrectionsDialog
        draftCount={stats.draft}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSubmitSuccess}
      />
    </>
  );
}

