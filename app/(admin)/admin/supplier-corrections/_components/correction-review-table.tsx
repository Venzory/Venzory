'use client';

import { useState, useTransition, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, ChevronDown, ChevronUp, Factory, Package, AlertCircle, Loader2 } from 'lucide-react';
import type { CorrectionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { approveCorrectionAction, rejectCorrectionAction } from '../actions';

interface CorrectionData {
  id: string;
  supplierItemId: string;
  globalSupplierId: string;
  originalData: Prisma.JsonValue;
  proposedData: Prisma.JsonValue;
  status: CorrectionStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  supplierItem?: {
    id: string;
    supplierSku: string | null;
    supplierName: string | null;
    supplierDescription: string | null;
    unitPrice: Prisma.Decimal | null;
    minOrderQty: number | null;
    product?: {
      id: string;
      name: string;
      gtin: string | null;
      brand: string | null;
    };
  };
  globalSupplier?: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface CorrectionReviewTableProps {
  corrections: CorrectionData[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toFixed(2);
  return String(value);
}

function ChangeRow({ label, original, proposed }: { label: string; original: unknown; proposed: unknown }) {
  const hasChange = original !== proposed;
  if (!hasChange) return null;

  return (
    <div className="flex items-start gap-4 py-1.5">
      <div className="w-28 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex flex-1 items-center gap-2">
        <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700 line-through dark:bg-rose-900/30 dark:text-rose-300">
          {formatValue(original)}
        </span>
        <span className="text-slate-400">→</span>
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {formatValue(proposed)}
        </span>
      </div>
    </div>
  );
}

function CorrectionRow({ correction }: { correction: CorrectionData }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const originalData = correction.originalData as {
    unitPrice?: number | null;
    minOrderQty?: number | null;
    supplierDescription?: string | null;
    gtin?: string | null;
  };

  const proposedData = correction.proposedData as {
    unitPrice?: number | null;
    minOrderQty?: number | null;
    supplierDescription?: string | null;
    gtin?: string | null;
  };

  const handleApprove = useCallback(() => {
    setActionError(null);
    startTransition(async () => {
      const result = await approveCorrectionAction(correction.id);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to approve');
      }
    });
  }, [correction.id]);

  const handleReject = useCallback(() => {
    setActionError(null);
    startTransition(async () => {
      const result = await rejectCorrectionAction(correction.id, rejectReason);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to reject');
      } else {
        setShowRejectInput(false);
        setRejectReason('');
      }
    });
  }, [correction.id, rejectReason]);

  return (
    <div className="border-b border-slate-200 last:border-b-0 dark:border-slate-800">
      {/* Header row */}
      <div
        className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="text-slate-400">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Factory className="h-4 w-4 text-slate-500" />
        </div>

        <div className="flex-1">
          <div className="font-medium text-slate-900 dark:text-white">
            {correction.globalSupplier?.name ?? 'Unknown Supplier'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {correction.supplierItem?.product?.name ?? 'Unknown Product'}
            {correction.supplierItem?.supplierSku && (
              <span className="ml-2 font-mono">SKU: {correction.supplierItem.supplierSku}</span>
            )}
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          {correction.submittedAt && (
            <div>Submitted {formatDistanceToNow(new Date(correction.submittedAt), { addSuffix: true })}</div>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Approve
          </button>
          <button
            onClick={() => setShowRejectInput(!showRejectInput)}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      </div>

      {/* Error message */}
      {actionError && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4" />
          {actionError}
        </div>
      )}

      {/* Reject input */}
      {showRejectInput && (
        <div className="mx-4 mb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-admin focus:ring-admin dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={handleReject}
            disabled={isPending}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm Reject
          </button>
          <button
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason('');
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Product info */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Package className="h-4 w-4" />
                Product Details
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="text-slate-900 dark:text-white">
                    {correction.supplierItem?.product?.name ?? '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Brand:</span>
                  <span className="text-slate-900 dark:text-white">
                    {correction.supplierItem?.product?.brand ?? '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current GTIN:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {correction.supplierItem?.product?.gtin ?? '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Changes */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Proposed Changes
              </h4>
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <ChangeRow
                  label="Price"
                  original={originalData.unitPrice}
                  proposed={proposedData.unitPrice}
                />
                <ChangeRow
                  label="Min Qty"
                  original={originalData.minOrderQty}
                  proposed={proposedData.minOrderQty}
                />
                <ChangeRow
                  label="Description"
                  original={originalData.supplierDescription}
                  proposed={proposedData.supplierDescription}
                />
                <ChangeRow
                  label="GTIN"
                  original={originalData.gtin}
                  proposed={proposedData.gtin}
                />
                {originalData.unitPrice === proposedData.unitPrice &&
                  originalData.minOrderQty === proposedData.minOrderQty &&
                  originalData.supplierDescription === proposedData.supplierDescription &&
                  originalData.gtin === proposedData.gtin && (
                    <p className="text-xs text-slate-500">No changes detected</p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CorrectionReviewTable({ corrections }: CorrectionReviewTableProps) {
  if (corrections.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <Check className="mx-auto h-12 w-12 text-emerald-400" />
        <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
          All caught up!
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          No pending supplier corrections to review.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      {corrections.map((correction) => (
        <CorrectionRow key={correction.id} correction={correction} />
      ))}
    </div>
  );
}

