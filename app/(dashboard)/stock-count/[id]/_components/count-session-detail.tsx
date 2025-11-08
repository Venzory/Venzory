'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  MapPin,
  ScanLine,
  Plus,
  Trash2,
  Check,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { StockCountStatus } from '@prisma/client';
import { ScannerModal } from '@/components/scanner/scanner-modal';
import { useScanner } from '@/hooks/use-scanner';
import {
  completeStockCountAction,
  cancelStockCountAction,
} from '../../actions';
import { searchItemByGtinAction } from '../../../receiving/actions';
import { AddCountLineForm } from './add-count-line-form';
import { ExpectedCountItemsForm } from './expected-count-items-form';

interface ExpectedCountItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  unit: string | null;
  systemQuantity: number;
}

interface CountSessionDetailProps {
  session: {
    id: string;
    status: StockCountStatus;
    notes: string | null;
    createdAt: Date;
    completedAt: Date | null;
    location: { id: string; name: string };
    lines: Array<{
      id: string;
      countedQuantity: number;
      systemQuantity: number;
      variance: number;
      notes: string | null;
      item: {
        id: string;
        name: string;
        sku: string | null;
        unit: string | null;
        product: { gtin: string | null };
      };
    }>;
    createdBy: { name: string | null; email: string };
  };
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    product: { gtin: string | null };
  }>;
  expectedItems: ExpectedCountItem[];
  canEdit: boolean;
}

export function CountSessionDetail({ session, items, expectedItems, canEdit }: CountSessionDetailProps) {
  const router = useRouter();
  const { isOpen, openScanner, closeScanner } = useScanner();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleScanResult = async (code: string) => {
    try {
      const result = await searchItemByGtinAction(code);

      if (result.item) {
        setSelectedItemId(result.item.id);
        setShowAddForm(true);
      } else {
        alert(`No item found for barcode: ${code}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search for item');
    }
  };

  const handleComplete = async (applyAdjustments: boolean) => {
    const message = applyAdjustments
      ? 'Complete this count and apply adjustments to inventory? This cannot be undone.'
      : 'Complete this count without applying adjustments?';

    if (!confirm(message)) {
      return;
    }

    setIsCompleting(true);
    try {
      await completeStockCountAction(session.id, applyAdjustments);
      router.refresh();
    } catch (error) {
      console.error('Complete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete count');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this count session? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelStockCountAction(session.id);
      router.refresh();
    } catch (error) {
      console.error('Cancel error:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel session');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: StockCountStatus) => {
    switch (status) {
      case StockCountStatus.IN_PROGRESS:
        return 'bg-amber-900/20 text-amber-300 border-amber-800';
      case StockCountStatus.COMPLETED:
        return 'bg-green-900/20 text-green-300 border-green-800';
      case StockCountStatus.CANCELLED:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
    }
  };

  const totalVariance = session.lines.reduce((sum, line) => sum + Math.abs(line.variance), 0);
  const positiveVariance = session.lines.filter((line) => line.variance > 0).length;
  const negativeVariance = session.lines.filter((line) => line.variance < 0).length;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Count #{session.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(session.status)}`}
              >
                {session.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Started {format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}
            </p>
          </div>

          {canEdit && session.lines.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                <X className="h-5 w-5" />
                Cancel
              </button>
              <button
                onClick={() => handleComplete(false)}
                disabled={isCompleting}
                className="flex items-center justify-center gap-2 rounded-lg border border-sky-700 px-6 py-3 font-semibold text-sky-200 transition hover:bg-sky-900 disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                Complete (No Adjust)
              </button>
              <button
                onClick={() => handleComplete(true)}
                disabled={isCompleting}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                <Check className="h-5 w-5" />
                Complete & Apply
              </button>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Location</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {session.location.name}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Items Counted</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {session.lines.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Overage</p>
                <p className="text-sm font-medium text-green-400">+{positiveVariance} items</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Shortage</p>
                <p className="text-sm font-medium text-rose-400">-{negativeVariance} items</p>
              </div>
            </div>
          </div>
        </div>

        {session.notes && (
          <div className="rounded-lg border border-card-border bg-card p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{session.notes}</p>
          </div>
        )}

        {/* Expected Items Quick Counting */}
        {canEdit && expectedItems.length > 0 && (
          <div className="rounded-lg border border-card-border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Quick Count - Location Inventory
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Count items currently in stock at this location
              </p>
            </div>
            <ExpectedCountItemsForm
              sessionId={session.id}
              expectedItems={expectedItems}
              onSuccess={() => router.refresh()}
            />
          </div>
        )}

        {/* Action Buttons (for adding items) */}
        {canEdit && (expectedItems.length === 0 || session.lines.length > 0) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={openScanner}
              className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
              style={{ minHeight: '48px' }}
            >
              <ScanLine className="h-5 w-5" />
              Scan Item
            </button>
            <button
              onClick={() => {
                setSelectedItemId(null);
                setShowAddForm(true);
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
              style={{ minHeight: '48px' }}
            >
              <Plus className="h-5 w-5" />
              Add Item Manually
            </button>
          </div>
        )}

        {/* Add Count Line Form */}
        {showAddForm && canEdit && (
          <div className="rounded-lg border border-card-border bg-card p-6">
            <AddCountLineForm
              sessionId={session.id}
              locationId={session.location.id}
              items={items}
              selectedItemId={selectedItemId}
              onSuccess={() => {
                setShowAddForm(false);
                setSelectedItemId(null);
                router.refresh();
              }}
              onCancel={() => {
                setShowAddForm(false);
                setSelectedItemId(null);
              }}
            />
          </div>
        )}

        {/* Count Lines List */}
        <div className="rounded-lg border border-card-border bg-card">
          <div className="border-b border-card-border p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Count Lines
            </h2>
          </div>

          {session.lines.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                No items counted yet
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Scan items or add them manually to start counting
              </p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {session.lines.map((line) => {
                const varianceColor =
                  line.variance > 0
                    ? 'text-green-400'
                    : line.variance < 0
                      ? 'text-rose-400'
                      : 'text-slate-400';

                return (
                  <div key={line.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {line.item.name}
                          </h3>
                          {line.item.sku && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              SKU: {line.item.sku}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">System</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {line.systemQuantity} {line.item.unit || 'units'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Counted</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {line.countedQuantity} {line.item.unit || 'units'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Variance</p>
                            <p className={`font-medium ${varianceColor}`}>
                              {line.variance > 0 ? '+' : ''}
                              {line.variance}
                            </p>
                          </div>
                        </div>

                        {line.notes && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{line.notes}</p>
                        )}
                      </div>

                      {canEdit && (
                        <button
                          onClick={async () => {
                            if (confirm('Remove this line?')) {
                              const { removeCountLineAction } = await import('../../actions');
                              try {
                                await removeCountLineAction(line.id);
                                router.refresh();
                              } catch (error) {
                                alert('Failed to remove line');
                              }
                            }
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isOpen}
        onClose={closeScanner}
        onScan={handleScanResult}
        title="Scan Item Barcode"
      />
    </>
  );
}

