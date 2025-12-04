'use client';

import { useState, useCallback, useTransition } from 'react';
import { Package, Pencil, Check, X, Loader2, AlertCircle } from 'lucide-react';
import type { SupplierItem, Product, SupplierCorrection, CorrectionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { saveCorrectionAction, deleteDraftCorrectionAction } from '../actions';
import { validateGtin, isGtinLikeFormat } from '@/lib/gtin-validation';

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

interface EditableItemTableProps {
  items: SupplierItemWithProduct[];
}

interface EditingState {
  unitPrice: string;
  minOrderQty: string;
  supplierDescription: string;
  gtin: string;
}

function getStatusBadge(status: CorrectionStatus | undefined) {
  if (!status) return null;

  switch (status) {
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Draft
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Pending Review
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          Rejected
        </span>
      );
    default:
      return null;
  }
}

export function EditableItemTable({ items }: EditableItemTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditingState>({
    unitPrice: '',
    minOrderQty: '',
    supplierDescription: '',
    gtin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [gtinError, setGtinError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = useCallback((item: SupplierItemWithProduct) => {
    // Check for active correction with proposed data
    const activeCorrection = item.corrections?.find(
      c => c.status === 'DRAFT' || c.status === 'PENDING'
    );
    const proposedData = activeCorrection?.proposedData as {
      unitPrice?: number | null;
      minOrderQty?: number | null;
      supplierDescription?: string | null;
      gtin?: string | null;
    } | undefined;

    setEditingId(item.id);
    setEditState({
      unitPrice: String(proposedData?.unitPrice ?? item.unitPrice ?? ''),
      minOrderQty: String(proposedData?.minOrderQty ?? item.minOrderQty ?? 1),
      supplierDescription: proposedData?.supplierDescription ?? item.supplierDescription ?? '',
      gtin: proposedData?.gtin ?? item.product.gtin ?? '',
    });
    setError(null);
    setGtinError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditState({ unitPrice: '', minOrderQty: '', supplierDescription: '', gtin: '' });
    setError(null);
    setGtinError(null);
  }, []);

  const validateGtinInput = useCallback((value: string) => {
    if (!value || value.trim() === '') {
      setGtinError(null);
      return true;
    }

    if (!isGtinLikeFormat(value)) {
      setGtinError('GTIN must be 8-14 digits');
      return false;
    }

    const result = validateGtin(value);
    if (!result.valid) {
      setGtinError(result.error ?? 'Invalid GTIN');
      return false;
    }

    setGtinError(null);
    return true;
  }, []);

  const handleSave = useCallback(async (itemId: string) => {
    // Validate GTIN before saving
    if (!validateGtinInput(editState.gtin)) {
      return;
    }

    startTransition(async () => {
      const result = await saveCorrectionAction({
        supplierItemId: itemId,
        unitPrice: editState.unitPrice ? Number(editState.unitPrice) : null,
        minOrderQty: editState.minOrderQty ? Number(editState.minOrderQty) : null,
        supplierDescription: editState.supplierDescription || null,
        gtin: editState.gtin || null,
      });

      if (result.success) {
        setEditingId(null);
        setEditState({ unitPrice: '', minOrderQty: '', supplierDescription: '', gtin: '' });
        setError(null);
      } else {
        setError(result.error ?? 'Failed to save');
      }
    });
  }, [editState, validateGtinInput]);

  const handleDeleteDraft = useCallback(async (correctionId: string) => {
    startTransition(async () => {
      const result = await deleteDraftCorrectionAction(correctionId);
      if (!result.success) {
        setError(result.error ?? 'Failed to delete draft');
      }
    });
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No products in your catalog yet. Upload a catalog to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      {error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                GTIN
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Min Qty
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const activeCorrection = item.corrections?.find(
                c => c.status === 'DRAFT' || c.status === 'PENDING'
              );
              const hasDraft = activeCorrection?.status === 'DRAFT';
              const isPendingReview = activeCorrection?.status === 'PENDING';

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isEditing
                      ? 'bg-teal-50/50 dark:bg-teal-900/10'
                      : hasDraft
                      ? 'bg-amber-50/30 dark:bg-amber-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.supplierName || item.product.name}
                      </div>
                      {item.product.brand && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.product.brand}
                        </div>
                      )}
                      {item.supplierSku && (
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          SKU: {item.supplierSku}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          value={editState.gtin}
                          onChange={(e) => {
                            setEditState({ ...editState, gtin: e.target.value });
                            validateGtinInput(e.target.value);
                          }}
                          className={`w-36 rounded border px-2 py-1 font-mono text-sm ${
                            gtinError
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                              : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800'
                          }`}
                          placeholder="Enter GTIN"
                        />
                        {gtinError && (
                          <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                            {gtinError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {item.product.gtin || '-'}
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {isEditing ? (
                      <textarea
                        value={editState.supplierDescription}
                        onChange={(e) => setEditState({ ...editState, supplierDescription: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800"
                        rows={2}
                        placeholder="Product description"
                      />
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {item.supplierDescription || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-500">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editState.unitPrice}
                          onChange={(e) => setEditState({ ...editState, unitPrice: e.target.value })}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          item.unitPrice
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.unitPrice ? `€${Number(item.unitPrice).toFixed(2)}` : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={editState.minOrderQty}
                        onChange={(e) => setEditState({ ...editState, minOrderQty: e.target.value })}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-teal-500 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.minOrderQty || 1}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(activeCorrection?.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(item.id)}
                          disabled={isPending || !!gtinError}
                          className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-900/30"
                          title="Save"
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isPending}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : isPendingReview ? (
                      <span className="text-xs text-slate-400">Awaiting review</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {hasDraft && activeCorrection && (
                          <button
                            onClick={() => handleDeleteDraft(activeCorrection.id)}
                            disabled={isPending}
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-rose-900/30"
                            title="Discard draft"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

