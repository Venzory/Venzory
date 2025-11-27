'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ReviewActions } from './review-actions';
import { CheckCircle2, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewItem {
  id: string;
  supplierName: string;
  productName: string;
  productId: string;
  productGtin: string | null;
  productBrand: string | null;
  supplierSku: string | null;
  supplierItemName: string | null;
  matchMethod: string;
  matchConfidence: number | null;
  needsReview: boolean;
  createdAt: Date;
}

interface ReviewTableProps {
  items: ReviewItem[];
}

function ConfidenceBadge({ confidence, needsReview }: { confidence: number | null; needsReview: boolean }) {
  if (needsReview) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Needs Review
      </span>
    );
  }
  
  if (confidence === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <HelpCircle className="h-3 w-3" />
        Unknown
      </span>
    );
  }
  
  const percentage = Math.round(confidence * 100);
  
  if (percentage >= 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {percentage}%
      </span>
    );
  }
  
  if (percentage >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {percentage}%
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      {percentage}%
    </span>
  );
}

function MatchMethodBadge({ method }: { method: string }) {
  const methodLabels: Record<string, { label: string; className: string }> = {
    MANUAL: { label: 'Manual', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    EXACT_GTIN: { label: 'GTIN Match', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    FUZZY_NAME: { label: 'Fuzzy Match', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    BARCODE_SCAN: { label: 'Barcode', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    SUPPLIER_MAPPED: { label: 'Supplier Map', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const config = methodLabels[method] || { label: method, className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ReviewTable({ items }: ReviewTableProps) {
  const router = useRouter();

  const handleActionComplete = () => {
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="All items reviewed"
        description="There are no supplier items needing review at this time."
      />
    );
  }

  const columns = [
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: (item: ReviewItem) => (
        <div className="min-w-[120px]">
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {item.supplierName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'supplierItem',
      header: 'Supplier Item',
      cell: (item: ReviewItem) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[250px]">
            {item.supplierItemName || item.productName}
          </div>
          {item.supplierSku && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              SKU: {item.supplierSku}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'matchedProduct',
      header: 'Matched Product',
      cell: (item: ReviewItem) => (
        <div className="min-w-[180px]">
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
              {item.productName}
            </span>
            <Link
              href={`/owner/product-master/${item.productId}`}
              className="text-sky-500 hover:text-sky-600"
              title="View product"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {item.productGtin ? (
              <span className="font-mono">{item.productGtin}</span>
            ) : (
              <span className="text-red-500">No GTIN</span>
            )}
            {item.productBrand && <span className="ml-2">{item.productBrand}</span>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'matchMethod',
      header: 'Match Method',
      cell: (item: ReviewItem) => <MatchMethodBadge method={item.matchMethod} />,
    },
    {
      accessorKey: 'confidence',
      header: 'Confidence',
      cell: (item: ReviewItem) => (
        <ConfidenceBadge 
          confidence={item.matchConfidence} 
          needsReview={item.needsReview} 
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Imported',
      cell: (item: ReviewItem) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: (item: ReviewItem) => (
        <ReviewActions item={item} onActionComplete={handleActionComplete} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Review Queue
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {items.length} items need review
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <DataTable 
            columns={columns} 
            data={items} 
            className="border-0"
            getRowClassName={(item) => 
              item.needsReview 
                ? 'bg-amber-50/50 dark:bg-amber-900/10' 
                : ''
            }
          />
        </div>
      </div>
    </div>
  );
}

