import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Gs1StatusBadge } from '../../product-master/_components/gs1-status-badge';
import { AlertTriangle, ChevronRight } from 'lucide-react';

interface LowQualityProduct {
  id: string;
  name: string;
  gtin: string | null;
  brand: string | null;
  gs1Status: string;
  isRegulatedDevice: boolean;
  qualityScore: number;
  componentScores: {
    basicData: number;
    gs1Data: number;
    media: number;
    documents: number;
    regulatory: number;
    packaging: number;
  };
  missingFields: string[];
  warnings: string[];
}

interface LowQualityTableProps {
  products: LowQualityProduct[];
}

function QualityScoreBadge({ score }: { score: number }) {
  let colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  
  if (score >= 70) {
    colorClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  } else if (score >= 50) {
    colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  } else if (score >= 30) {
    colorClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {score}
    </span>
  );
}

function ComponentScoreBar({ label, score }: { label: string; score: number }) {
  let bgColor = 'bg-red-500';
  if (score >= 70) bgColor = 'bg-emerald-500';
  else if (score >= 50) bgColor = 'bg-amber-500';
  else if (score >= 30) bgColor = 'bg-orange-500';
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-500 dark:text-slate-400 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${bgColor} rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-6 text-right text-slate-600 dark:text-slate-300">{score}</span>
    </div>
  );
}

export function LowQualityTable({ products }: LowQualityTableProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No low-quality products"
        description="All products have quality scores above 50. Great job!"
      />
    );
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: (product: LowQualityProduct) => (
        <div className="flex flex-col min-w-[200px]">
          <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[250px]">
            {product.name}
          </span>
          {product.brand && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {product.brand}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'gtin',
      header: 'GTIN',
      cell: (product: LowQualityProduct) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {product.gtin || <span className="text-red-500">Missing</span>}
        </span>
      ),
    },
    {
      accessorKey: 'qualityScore',
      header: 'Score',
      className: 'text-center',
      cell: (product: LowQualityProduct) => (
        <QualityScoreBadge score={product.qualityScore} />
      ),
    },
    {
      accessorKey: 'componentScores',
      header: 'Component Scores',
      cell: (product: LowQualityProduct) => (
        <div className="space-y-1 min-w-[180px]">
          <ComponentScoreBar label="Basic" score={product.componentScores.basicData} />
          <ComponentScoreBar label="GS1" score={product.componentScores.gs1Data} />
          <ComponentScoreBar label="Media" score={product.componentScores.media} />
          <ComponentScoreBar label="Docs" score={product.componentScores.documents} />
        </div>
      ),
    },
    {
      accessorKey: 'missingFields',
      header: 'Missing',
      cell: (product: LowQualityProduct) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {product.missingFields.slice(0, 4).map((field) => (
            <span 
              key={field}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            >
              {field}
            </span>
          ))}
          {product.missingFields.length > 4 && (
            <span className="text-xs text-slate-500">
              +{product.missingFields.length - 4} more
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'gs1Status',
      header: 'GS1 Status',
      cell: (product: LowQualityProduct) => (
        <Gs1StatusBadge status={product.gs1Status as any} />
      ),
    },
    {
      accessorKey: 'actions',
      header: '',
      className: 'text-right',
      cell: (product: LowQualityProduct) => (
        <Link
          href={`/admin/product-master/${product.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-admin transition hover:text-admin-hover"
        >
          View
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Products Needing Attention
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {products.length} products with quality score &lt; 50
        </span>
      </div>
      
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={products} className="border-0" />
        </div>
      </div>
    </div>
  );
}

