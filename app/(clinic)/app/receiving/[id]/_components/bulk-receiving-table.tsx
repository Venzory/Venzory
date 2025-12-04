'use client';

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Package,
  Save,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { ProductDetailDrawer } from '@/components/product/product-detail-drawer';
import { Badge } from '@/components/ui/badge';
import { addReceiptLineAction, updateReceiptLineAction } from '../../actions';

// Discrepancy types for receiving
export type DiscrepancyType = 'NONE' | 'SHORT' | 'OVER' | 'DAMAGE' | 'SUBSTITUTION' | 'PENDING_BACKORDER';

interface ExpectedItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  alreadyReceived: number;
  remainingQuantity: number;
  unit: string | null;
  productId?: string | null;
}

interface ReceiptLine {
  id: string;
  quantity: number;
  batchNumber: string | null;
  expiryDate: Date | null;
  notes: string | null;
  item: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    product: { id?: string; gtin: string | null };
  };
}

interface RowState {
  qtyReceived: number;
  discrepancy: DiscrepancyType;
  isBackorder: boolean; // true if short quantity is marked as expected backorder
  batchNumber: string;
  expiryDate: string;
  notes: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lineId: string | null; // null if not yet saved to receipt
}

interface BulkReceivingTableProps {
  receiptId: string;
  expectedItems: ExpectedItem[];
  existingLines: ReceiptLine[];
  onRefresh: () => void;
  onSubmitReceiving: () => void;
  canEdit: boolean;
}

// Information about items marked as backorder
export interface BackorderItemInfo {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unit: string | null;
}

// Expose methods via ref for parent component to access
export interface BulkReceivingTableRef {
  getBackorderItems: () => BackorderItemInfo[];
  getRowStates: () => Map<string, RowState>;
}

function calculateDiscrepancy(ordered: number, received: number): DiscrepancyType {
  if (received === 0) return 'NONE';
  if (received < ordered) return 'SHORT';
  if (received > ordered) return 'OVER';
  return 'NONE';
}

function getDiscrepancyBadge(discrepancy: DiscrepancyType, ordered: number, received: number) {
  switch (discrepancy) {
    case 'SHORT':
      return (
        <Badge variant="warning" className="gap-1">
          <ArrowDown className="h-3 w-3" />
          Short ({ordered - received})
        </Badge>
      );
    case 'OVER':
      return (
        <Badge variant="info" className="gap-1">
          <ArrowUp className="h-3 w-3" />
          Over (+{received - ordered})
        </Badge>
      );
    case 'DAMAGE':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Damage
        </Badge>
      );
    case 'SUBSTITUTION':
      return (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className="h-3 w-3" />
          Substitution
        </Badge>
      );
    case 'PENDING_BACKORDER':
      return (
        <Badge variant="outline" className="gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
          <Clock className="h-3 w-3" />
          Backorder ({ordered - received})
        </Badge>
      );
    case 'NONE':
    default:
      if (received === ordered && received > 0) {
        return (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            OK
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="gap-1 text-slate-500">
          <Minus className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

export const BulkReceivingTable = forwardRef<BulkReceivingTableRef, BulkReceivingTableProps>(
  function BulkReceivingTable({
    receiptId,
    expectedItems,
    existingLines,
    onRefresh,
    onSubmitReceiving,
    canEdit,
  }, ref) {
  const router = useRouter();
  
  // Product drawer state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Row states - keyed by itemId
  const [rowStates, setRowStates] = useState<Map<string, RowState>>(() => {
    const states = new Map<string, RowState>();
    
    for (const item of expectedItems) {
      // Find existing line for this item
      const existingLine = existingLines.find((l) => l.item.id === item.itemId);
      
      const qtyReceived = existingLine?.quantity ?? 0;
      const discrepancy = calculateDiscrepancy(item.orderedQuantity, qtyReceived);
      
      states.set(item.itemId, {
        qtyReceived,
        discrepancy,
        isBackorder: false,
        batchNumber: existingLine?.batchNumber ?? '',
        expiryDate: existingLine?.expiryDate 
          ? new Date(existingLine.expiryDate).toISOString().split('T')[0] 
          : '',
        notes: existingLine?.notes ?? '',
        isDirty: false,
        isSaving: false,
        saveError: null,
        lineId: existingLine?.id ?? null,
      });
    }
    
    return states;
  });
  
  // Debounce timers
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Global saving state
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  // Track if any rows have true discrepancies (not backorders)
  const hasDiscrepancies = Array.from(rowStates.values()).some(
    (r) => r.discrepancy !== 'NONE' && r.discrepancy !== 'PENDING_BACKORDER' && r.qtyReceived > 0
  );
  
  // Track if any rows have pending backorders
  const hasBackorders = Array.from(rowStates.values()).some(
    (r) => r.discrepancy === 'PENDING_BACKORDER' || r.isBackorder
  );
  
  // Track if any rows are dirty
  const hasDirtyRows = Array.from(rowStates.values()).some((r) => r.isDirty);
  
  // Track total items with qty received
  const itemsWithQty = Array.from(rowStates.values()).filter((r) => r.qtyReceived > 0).length;

  // Handle opening product drawer
  const handleProductClick = useCallback((productId: string | null | undefined) => {
    if (productId) {
      setSelectedProductId(productId);
      setIsDrawerOpen(true);
    }
  }, []);

  // Update row state
  const updateRowState = useCallback((itemId: string, updates: Partial<RowState>) => {
    setRowStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, ...updates, isDirty: true });
      }
      return newMap;
    });
  }, []);

  // Handle qty change with auto-discrepancy calculation
  const handleQtyChange = useCallback((itemId: string, qty: number, orderedQty: number) => {
    const state = rowStates.get(itemId);
    let discrepancy = calculateDiscrepancy(orderedQty, qty);
    
    // If item was marked as backorder and is still short, keep it as PENDING_BACKORDER
    if (state?.isBackorder && discrepancy === 'SHORT') {
      discrepancy = 'PENDING_BACKORDER';
    }
    // If quantity now matches or exceeds ordered, clear backorder state
    const isBackorder = discrepancy === 'PENDING_BACKORDER' ? true : (discrepancy === 'SHORT' ? state?.isBackorder ?? false : false);
    
    updateRowState(itemId, { qtyReceived: qty, discrepancy, isBackorder });
  }, [updateRowState, rowStates]);

  // Handle manual discrepancy override
  const handleDiscrepancyChange = useCallback((itemId: string, discrepancy: DiscrepancyType) => {
    // If changing to PENDING_BACKORDER, also mark isBackorder
    const isBackorder = discrepancy === 'PENDING_BACKORDER';
    updateRowState(itemId, { discrepancy, isBackorder });
  }, [updateRowState]);

  // Toggle backorder status for a short item
  const handleBackorderToggle = useCallback((itemId: string, orderedQty: number, receivedQty: number, isBackorder: boolean) => {
    if (isBackorder) {
      // Marking as backorder
      updateRowState(itemId, { isBackorder: true, discrepancy: 'PENDING_BACKORDER' });
    } else {
      // Unmarking as backorder - revert to SHORT if still short
      const discrepancy = calculateDiscrepancy(orderedQty, receivedQty);
      updateRowState(itemId, { isBackorder: false, discrepancy });
    }
  }, [updateRowState]);

  // Save a single row
  const saveRow = useCallback(async (itemId: string, item: ExpectedItem) => {
    const state = rowStates.get(itemId);
    if (!state || state.isSaving) return;

    // Mark as saving
    setRowStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, isSaving: true, saveError: null });
      }
      return newMap;
    });

    try {
      const formData = new FormData();
      formData.append('receiptId', receiptId);
      formData.append('itemId', itemId);
      formData.append('quantity', state.qtyReceived.toString());
      if (state.batchNumber) formData.append('batchNumber', state.batchNumber);
      if (state.expiryDate) formData.append('expiryDate', state.expiryDate);
      if (state.notes) formData.append('notes', state.notes);

      let result;
      if (state.lineId) {
        // Update existing line
        const updateFormData = new FormData();
        updateFormData.append('lineId', state.lineId);
        updateFormData.append('quantity', state.qtyReceived.toString());
        if (state.batchNumber) updateFormData.append('batchNumber', state.batchNumber);
        if (state.expiryDate) updateFormData.append('expiryDate', state.expiryDate);
        if (state.notes) updateFormData.append('notes', state.notes);
        
        result = await updateReceiptLineAction(null, updateFormData);
      } else {
        // Add new line
        result = await addReceiptLineAction(null, formData);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      // Mark as saved
      setRowStates((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(itemId);
        if (current) {
          newMap.set(itemId, { ...current, isSaving: false, isDirty: false, saveError: null });
        }
        return newMap;
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      setRowStates((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(itemId);
        if (current) {
          newMap.set(itemId, { ...current, isSaving: false, saveError: errorMessage });
        }
        return newMap;
      });
      toast.error(`Failed to save ${item.itemName}: ${errorMessage}`);
    }
  }, [receiptId, rowStates]);

  // Debounced save
  const debouncedSave = useCallback((itemId: string, item: ExpectedItem) => {
    // Clear existing timer
    const existingTimer = debounceTimers.current.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      saveRow(itemId, item);
      debounceTimers.current.delete(itemId);
    }, 1000);

    debounceTimers.current.set(itemId, timer);
  }, [saveRow]);

  // Save all dirty rows
  const saveAllDirty = useCallback(async () => {
    setIsBulkSaving(true);
    
    const dirtyItems = expectedItems.filter((item) => {
      const state = rowStates.get(item.itemId);
      return state?.isDirty;
    });

    for (const item of dirtyItems) {
      await saveRow(item.itemId, item);
    }

    setIsBulkSaving(false);
    onRefresh();
    toast.success('Progress saved');
  }, [expectedItems, rowStates, saveRow, onRefresh]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getBackorderItems: () => {
      const backorderItems: BackorderItemInfo[] = [];
      for (const item of expectedItems) {
        const state = rowStates.get(item.itemId);
        if (state && (state.isBackorder || state.discrepancy === 'PENDING_BACKORDER')) {
          backorderItems.push({
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: state.qtyReceived,
            pendingQuantity: item.orderedQuantity - state.qtyReceived,
            unit: item.unit,
          });
        }
      }
      return backorderItems;
    },
    getRowStates: () => rowStates,
  }), [expectedItems, rowStates]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Receive Order Items
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter received quantities for each item. Click product name to view details.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">
            {itemsWithQty} of {expectedItems.length} items entered
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  SKU
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Ordered
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Received
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Batch / Expiry
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 w-12">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {expectedItems.map((item) => {
                const state = rowStates.get(item.itemId);
                if (!state) return null;

                // Find product ID from existing lines
                const existingLine = existingLines.find((l) => l.item.id === item.itemId);
                const productId = existingLine?.item?.product?.id || item.productId;

                return (
                  <tr 
                    key={item.itemId}
                    className={`transition-colors ${
                      state.isDirty ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    } ${state.saveError ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}
                  >
                    {/* Product Name - Clickable */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleProductClick(productId)}
                        className="text-left group"
                        disabled={!productId}
                      >
                        <span className={`font-medium ${
                          productId 
                            ? 'text-sky-600 dark:text-sky-400 group-hover:underline cursor-pointer' 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {item.itemName}
                        </span>
                        {!productId && (
                          <Package className="inline ml-1 h-3 w-3 text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {item.itemSku || '—'}
                    </td>

                    {/* Qty Ordered */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {item.orderedQuantity}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">
                        {item.unit || 'units'}
                      </span>
                    </td>

                    {/* Qty Received - Editable */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={state.qtyReceived || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            handleQtyChange(item.itemId, val, item.orderedQuantity);
                            debouncedSave(item.itemId, item);
                          }}
                          disabled={!canEdit}
                          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="0"
                        />
                      </div>
                    </td>

                    {/* Discrepancy Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-2">
                        {canEdit && state.qtyReceived > 0 ? (
                          <>
                            <select
                              value={state.discrepancy}
                              onChange={(e) => {
                                handleDiscrepancyChange(item.itemId, e.target.value as DiscrepancyType);
                                debouncedSave(item.itemId, item);
                              }}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <option value="NONE">
                                {state.qtyReceived === item.orderedQuantity ? '✓ OK' : '— Pending'}
                              </option>
                              <option value="SHORT">↓ Short</option>
                              <option value="OVER">↑ Over</option>
                              <option value="DAMAGE">⚠ Damage</option>
                              <option value="SUBSTITUTION">↻ Substitution</option>
                              <option value="PENDING_BACKORDER">⏱ Backorder</option>
                            </select>
                            {/* Show backorder toggle when quantity is short */}
                            {state.qtyReceived < item.orderedQuantity && state.qtyReceived > 0 && (
                              <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={state.isBackorder || state.discrepancy === 'PENDING_BACKORDER'}
                                  onChange={(e) => {
                                    handleBackorderToggle(
                                      item.itemId, 
                                      item.orderedQuantity, 
                                      state.qtyReceived, 
                                      e.target.checked
                                    );
                                    debouncedSave(item.itemId, item);
                                  }}
                                  className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-500 dark:border-violet-600 dark:bg-slate-700"
                                />
                                <span className="text-xs text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                                  Backorder?
                                </span>
                              </label>
                            )}
                          </>
                        ) : (
                          getDiscrepancyBadge(state.discrepancy, item.orderedQuantity, state.qtyReceived)
                        )}
                      </div>
                    </td>

                    {/* Batch / Expiry */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="text"
                          value={state.batchNumber}
                          onChange={(e) => {
                            updateRowState(item.itemId, { batchNumber: e.target.value });
                            debouncedSave(item.itemId, item);
                          }}
                          disabled={!canEdit}
                          placeholder="Batch"
                          className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="date"
                          value={state.expiryDate}
                          onChange={(e) => {
                            updateRowState(item.itemId, { expiryDate: e.target.value });
                            debouncedSave(item.itemId, item);
                          }}
                          disabled={!canEdit}
                          className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </td>

                    {/* Save indicator */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {state.isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                        ) : state.saveError ? (
                          <span title={state.saveError}>
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                          </span>
                        ) : state.isDirty ? (
                          <div className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
                        ) : state.qtyReceived > 0 ? (
                          <span title="Saved">
                            <Check className="h-4 w-4 text-green-500" />
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Row */}
      <div className="flex items-center justify-between rounded-lg border border-card-border bg-slate-50 p-4 dark:bg-slate-800/50">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-500">Total Ordered:</span>{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {expectedItems.reduce((sum, i) => sum + i.orderedQuantity, 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Total Received:</span>{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {Array.from(rowStates.values()).reduce((sum, r) => sum + r.qtyReceived, 0)}
            </span>
          </div>
          {hasDiscrepancies && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Discrepancies detected</span>
            </div>
          )}
          {hasBackorders && (
            <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
              <Clock className="h-4 w-4" />
              <span>Backorders pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex items-center justify-between border-t border-card-border pt-4">
          <button
            type="button"
            onClick={saveAllDirty}
            disabled={!hasDirtyRows || isBulkSaving}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isBulkSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Progress
          </button>

          <div className="flex items-center gap-3">
            {hasDiscrepancies && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Review discrepancies before submitting
              </span>
            )}
            {!hasDiscrepancies && hasBackorders && (
              <span className="text-sm text-violet-600 dark:text-violet-400">
                Backorders will not block submission
              </span>
            )}
            <button
              type="button"
              onClick={onSubmitReceiving}
              disabled={itemsWithQty === 0 || hasDirtyRows}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Submit Receiving
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        productId={selectedProductId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProductId(null);
        }}
      />
    </div>
  );
});

