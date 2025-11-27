'use client';

import { useState } from 'react';
import { ImportForm } from './import-form';
import { ImportResults } from './import-results';
import { ImportHistory } from './import-history';
import type { ImportResult, SupplierOption } from '../actions';

interface ImportPageClientProps {
  suppliers: SupplierOption[];
  initialHistory: Array<{
    id: string;
    supplierName: string;
    filename: string;
    rowCount: number;
    successCount: number;
    failedCount: number;
    reviewCount: number;
    enrichedCount: number;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }>;
}

export function ImportPageClient({ suppliers, initialHistory }: ImportPageClientProps) {
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState(initialHistory);

  function handleImportComplete(result: ImportResult) {
    setLastResult(result);
    
    // Add to history (optimistic update)
    if (result.success && result.uploadId) {
      const selectedSupplier = suppliers.find(
        (s) => s.id === (document.querySelector('[name="globalSupplierId"]') as HTMLSelectElement)?.value
      );
      
      setHistory((prev) => [
        {
          id: result.uploadId!,
          supplierName: selectedSupplier?.name ?? 'Unknown',
          filename: 'upload.csv',
          rowCount: result.totalRows ?? 0,
          successCount: result.successCount ?? 0,
          failedCount: result.failedCount ?? 0,
          reviewCount: result.reviewCount ?? 0,
          enrichedCount: result.enrichedCount ?? 0,
          status: 'COMPLETED',
          errorMessage: null,
          createdAt: new Date(),
          completedAt: new Date(),
        },
        ...prev,
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <ImportForm suppliers={suppliers} onImportComplete={handleImportComplete} />
      
      {lastResult && lastResult.success && (
        <ImportResults result={lastResult} />
      )}
      
      <ImportHistory uploads={history} />
    </div>
  );
}

