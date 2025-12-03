'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import {
  Building2,
  Package,
  CheckCircle,
  RefreshCw,
  Plus,
  X,
  GitMerge,
  ExternalLink,
  User,
  Clock,
  Loader2,
  ScanBarcode,
  Tag,
  FileText,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  IssueBadges, 
  deriveIssues, 
  getConfidenceColor, 
  formatConfidence 
} from './issue-badges';
import { confirmMatch, markIgnored } from '../actions';
import type { TriageItem } from '../actions';

interface InspectorPanelProps {
  item: TriageItem | null;
  itemDetails: any | null;
  isLoading: boolean;
  onAction: (action: 'confirm' | 'reassign' | 'create' | 'merge' | 'ignore') => void;
  onClose: () => void;
  className?: string;
}

export function InspectorPanel({
  item,
  itemDetails,
  isLoading,
  onAction,
  onClose,
  className,
}: InspectorPanelProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  if (!item) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center p-8', className)}>
        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <Package className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
          Select an item
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Choose an item from the list to inspect
        </p>
      </div>
    );
  }

  const issues = deriveIssues(item);
  const product = itemDetails?.product;
  const otherSupplierItems = product?.supplierItems?.filter((si: any) => si.id !== item.id) ?? [];

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmMatch(item.id);
      if (result.success) {
        toast({ title: 'Match confirmed', description: 'Item removed from triage queue.' });
        onAction('confirm');
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleIgnore = () => {
    startTransition(async () => {
      const result = await markIgnored(item.id);
      if (result.success) {
        toast({ title: 'Item ignored', description: 'Item has been deactivated.' });
        onAction('ignore');
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{item.supplierName}</span>
          </div>
          <h3 className="mt-1 font-semibold text-slate-900 dark:text-white line-clamp-2">
            {item.supplierItemName || item.productName}
          </h3>
          {item.supplierSku && (
            <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              SKU: {item.supplierSku}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-admin" />
          </div>
        ) : (
          <>
            {/* Issues */}
            {issues.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Issues
                </h4>
                <IssueBadges issues={issues} maxVisible={5} size="md" />
              </section>
            )}

            {/* Comparison: Supplier Data vs Canonical Product */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Comparison
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Supplier Data */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    <Building2 className="h-3 w-3" />
                    Supplier Data
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <ComparisonRow 
                      label="Name" 
                      value={item.supplierItemName || '–'} 
                    />
                    <ComparisonRow 
                      label="SKU" 
                      value={item.supplierSku || '–'} 
                      mono 
                    />
                    <ComparisonRow 
                      label="Description" 
                      value={item.supplierDescription || '–'} 
                      truncate 
                    />
                    {itemDetails?.unitPrice && (
                      <ComparisonRow 
                        label="Price" 
                        value={`€${itemDetails.unitPrice.toFixed(2)}`} 
                      />
                    )}
                  </div>
                </div>

                {/* Canonical Product */}
                <div className="rounded-lg border border-admin/30 bg-admin/5 p-3 dark:border-admin/30 dark:bg-admin/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-admin dark:text-admin">
                      <Package className="h-3 w-3" />
                      Canonical Product
                    </div>
                    <Link
                      href={`/admin/product-master/${item.productId}`}
                      className="text-admin hover:text-admin-hover"
                      title="View product"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <ComparisonRow 
                      label="Name" 
                      value={item.productName} 
                    />
                    <ComparisonRow 
                      label="GTIN" 
                      value={item.productGtin || '–'} 
                      mono 
                      highlight={!item.productGtin}
                    />
                    <ComparisonRow 
                      label="Brand" 
                      value={item.productBrand || '–'} 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Match Details */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Match Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Method:</span>
                  <MatchMethodBadge method={item.matchMethod} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Confidence:</span>
                  <span className={cn('font-medium', getConfidenceColor(item.matchConfidence))}>
                    {formatConfidence(item.matchConfidence)}
                  </span>
                </div>
                {item.matchedAt && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">
                      Matched {formatDistanceToNow(new Date(item.matchedAt), { addSuffix: true })}
                    </span>
                    {item.matchedBy && (
                      <>
                        <span className="text-slate-400">by</span>
                        <span className="text-slate-700 dark:text-slate-300">{item.matchedBy}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Quality Score */}
            {product?.qualityScore && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quality Score
                </h4>
                <QualityScoreBar score={product.qualityScore.overallScore} />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <QualityComponent label="Basic" score={product.qualityScore.basicDataScore} />
                  <QualityComponent label="GS1" score={product.qualityScore.gs1DataScore} />
                  <QualityComponent label="Media" score={product.qualityScore.mediaScore} />
                  <QualityComponent label="Docs" score={product.qualityScore.documentScore} />
                  <QualityComponent label="Regulatory" score={product.qualityScore.regulatoryScore} />
                  <QualityComponent label="Packaging" score={product.qualityScore.packagingScore} />
                </div>
                {product.qualityScore.missingFields?.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Missing:</span>{' '}
                    {product.qualityScore.missingFields.slice(0, 3).join(', ')}
                    {product.qualityScore.missingFields.length > 3 && ' ...'}
                  </div>
                )}
              </section>
            )}

            {/* Other Suppliers */}
            {otherSupplierItems.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Also Linked ({otherSupplierItems.length})
                </h4>
                <div className="space-y-2">
                  {otherSupplierItems.slice(0, 3).map((si: any) => (
                    <div
                      key={si.id}
                      className="flex items-center justify-between rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700"
                    >
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {si.globalSupplier?.name}
                      </span>
                      {si.supplierSku && (
                        <span className="font-mono text-slate-400">{si.supplierSku}</span>
                      )}
                    </div>
                  ))}
                  {otherSupplierItems.length > 3 && (
                    <p className="text-xs text-slate-500">
                      +{otherSupplierItems.length - 3} more suppliers
                    </p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span>Confirm</span>
            <kbd className="ml-1 text-[10px] opacity-60">C</kbd>
          </button>
          
          <button
            onClick={() => onAction('reassign')}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-admin px-3 py-2 text-sm font-medium text-white hover:bg-admin-hover disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reassign</span>
            <kbd className="ml-1 text-[10px] opacity-60">R</kbd>
          </button>
          
          <button
            onClick={() => onAction('create')}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New</span>
            <kbd className="ml-1 text-[10px] opacity-60">N</kbd>
          </button>
          
          {otherSupplierItems.length > 0 && (
            <button
              onClick={() => onAction('merge')}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              <span>Merge</span>
              <kbd className="ml-1 text-[10px] opacity-60">M</kbd>
            </button>
          )}
          
          <button
            onClick={handleIgnore}
            disabled={isPending}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors",
              otherSupplierItems.length === 0 && "col-span-2"
            )}
          >
            <X className="h-4 w-4" />
            <span>Ignore</span>
            <kbd className="ml-1 text-[10px] opacity-60">X</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ 
  label, 
  value, 
  mono, 
  truncate: shouldTruncate,
  highlight,
}: { 
  label: string; 
  value: string; 
  mono?: boolean;
  truncate?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{label}:</span>
      <span 
        className={cn(
          'text-right text-slate-700 dark:text-slate-300',
          mono && 'font-mono',
          shouldTruncate && 'truncate',
          highlight && 'text-red-500 dark:text-red-400'
        )}
        title={shouldTruncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function MatchMethodBadge({ method }: { method: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    MANUAL: { label: 'Manual', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    EXACT_GTIN: { label: 'GTIN', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    FUZZY_NAME: { label: 'Fuzzy', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    BARCODE_SCAN: { label: 'Barcode', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    SUPPLIER_MAPPED: { label: 'Mapped', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const config = configs[method] || { label: method, className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}

function QualityScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Overall</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function QualityComponent({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' 
    : score >= 50 ? 'text-amber-600 dark:text-amber-400' 
    : 'text-red-600 dark:text-red-400';
  
  return (
    <div className="text-center">
      <div className={cn('font-medium', color)}>{score}%</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

