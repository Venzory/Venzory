'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  PackageCheck,
  MapPin,
  Building2,
  ShoppingCart,
  ScanLine,
  Plus,
  Trash2,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import { GoodsReceiptStatus } from '@prisma/client';
import { ScannerModal } from '@/components/scanner/scanner-modal';
import { useScanner } from '@/hooks/use-scanner';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import {
  confirmGoodsReceiptAction,
  cancelGoodsReceiptAction,
  searchItemByGtinAction,
} from '../../actions';
import { AddLineForm } from './add-line-form';
import { ExpectedItemsForm } from './expected-items-form';

interface ReceiptDetailProps {
  receipt: {
    id: string;
    status: GoodsReceiptStatus;
    notes: string | null;
    createdAt: Date;
    receivedAt: Date | null;
    location: { id: string; name: string };
    supplier: { id: string; name: string } | null;
    order: { id: string; reference: string | null } | null;
    lines: Array<{
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
  canEdit: boolean;
  expectedItems?: Array<{
    itemId: string;
    itemName: string;
    itemSku: string | null;
    orderedQuantity: number;
    alreadyReceived: number;
    remainingQuantity: number;
    unit: string | null;
  }> | null;
}

export function ReceiptDetail({ receipt, items, canEdit, expectedItems }: ReceiptDetailProps) {
  const router = useRouter();
  const { isOpen, openScanner, closeScanner, handleScan } = useScanner();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const confirm = useConfirm();

  const handleScanResult = async (code: string) => {
    try {
      const result = await searchItemByGtinAction(code);

      if (result.item) {
        setSelectedItemId(result.item.id);
        setShowAddForm(true);
      } else {
        toast.error(`No item found for barcode: ${code}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search for item');
    }
  };

  const handleConfirm = async () => {
    const confirmed = await confirm({
      title: 'Confirm Receipt',
      message: 'Confirm this receipt? This will update inventory and cannot be undone.',
      confirmLabel: 'Confirm',
      variant: 'neutral',
    });

    if (!confirmed) {
      return;
    }

    setIsConfirming(true);
    try {
      const result = await confirmGoodsReceiptAction(receipt.id);
      
      // Show success message
      toast.success('Receipt confirmed and inventory updated');
      
      // Show low stock warnings if any
      if (result.lowStockWarnings && result.lowStockWarnings.length > 0) {
        result.lowStockWarnings.forEach((itemName) => {
          toast.info(`Low stock: ${itemName}`);
        });
      }
      
      // Navigate to the appropriate page
      router.push(result.redirectTo);
    } catch (error) {
      console.error('Confirm error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to confirm receipt');
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Receipt',
      message: 'Cancel this receipt? This action cannot be undone.',
      confirmLabel: 'Cancel Receipt',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelGoodsReceiptAction(receipt.id);
      toast.success('Receipt cancelled');
      router.refresh();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel receipt');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: GoodsReceiptStatus) => {
    switch (status) {
      case GoodsReceiptStatus.DRAFT:
        return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
      case GoodsReceiptStatus.CONFIRMED:
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case GoodsReceiptStatus.CANCELLED:
        return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/20 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/20 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const totalQuantity = (receipt.lines || []).reduce((sum, line) => sum + (line?.quantity || 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Receipt #{receipt.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(receipt.status)}`}
              >
                {receipt.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Created {format(new Date(receipt.createdAt), 'MMM d, yyyy HH:mm')}
            </p>
          </div>

          {canEdit && (receipt.lines || []).length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                style={{ minHeight: '48px' }}
              >
                <X className="h-5 w-5" />
                Cancel Receipt
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                <Check className="h-5 w-5" />
                Confirm Receipt
              </button>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Location</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {receipt.location.name}
                </p>
              </div>
            </div>
          </div>

          {receipt.order && (
            <div className="rounded-lg border border-card-border bg-card p-3">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Order</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {receipt.order.reference || `#${receipt.order.id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {receipt.supplier && (
            <div className="rounded-lg border border-card-border bg-card p-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Supplier</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {receipt.supplier.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Summary</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {(receipt.lines || []).length} items, {totalQuantity} units
                </p>
              </div>
            </div>
          </div>
        </div>

        {receipt.notes && (
          <div className="rounded-lg border border-card-border bg-card p-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{receipt.notes}</p>
          </div>
        )}

        {/* Expected Items Quick Entry (when receiving an order) */}
        {canEdit && expectedItems && Array.isArray(expectedItems) && receipt.order && (
          <>
            {expectedItems.length > 0 ? (
              <div className="rounded-lg border border-card-border bg-card p-4">
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Receive Order Items
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Quickly enter batch numbers and expiry dates for expected items
                  </p>
                </div>
                <ExpectedItemsForm
                  receiptId={receipt.id}
                  expectedItems={expectedItems}
                  receivedItemIds={new Set((receipt.lines || []).map((l) => l?.item?.id).filter(Boolean))}
                  onSuccess={() => router.refresh()}
                />
              </div>
            ) : (receipt.lines || []).length > 0 && (
              <div className="rounded-lg border border-green-600 bg-green-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-green-100">
                      All Order Items Received
                    </h3>
                    <p className="mt-1 text-sm text-green-300">
                      You&apos;ve received all {(receipt.lines || []).length} items from this order. 
                      Review the receipt lines below and click &quot;Confirm Receipt&quot; when ready to update inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Manual Entry (when not receiving an order, or after finishing expected items) */}
        {canEdit && (!expectedItems || expectedItems.length === 0 || (receipt.lines || []).length > 0) && (
          <>
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openScanner}
                className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
                style={{ minHeight: '48px' }}
              >
                <ScanLine className="h-5 w-5" />
                Scan Barcode
              </button>
              <button
                onClick={() => {
                  setSelectedItemId(null);
                  setShowAddForm(true);
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                style={{ minHeight: '48px' }}
              >
                <Plus className="h-5 w-5" />
                Add Item Manually
              </button>
            </div>

            {/* Add Line Form */}
            {showAddForm && (
              <div className="rounded-lg border border-card-border bg-card p-6">
                <AddLineForm
                  receiptId={receipt.id}
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
          </>
        )}

        {/* Lines List */}
        <div className="rounded-lg border border-card-border bg-card">
          <div className="border-b border-card-border p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Receipt Lines
            </h2>
          </div>

          {(receipt.lines || []).length === 0 ? (
            <div className="p-12 text-center">
              <PackageCheck className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                No items added yet
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Scan a barcode or add items manually to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {(receipt.lines || []).map((line) => (
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
                          <p className="text-slate-600 dark:text-slate-400">Quantity</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {line.quantity} {line.item.unit || 'units'}
                          </p>
                        </div>
                        {line.batchNumber && (
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Batch</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {line.batchNumber}
                            </p>
                          </div>
                        )}
                        {line.expiryDate && (
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Expiry</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {format(new Date(line.expiryDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>

                      {line.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">{line.notes}</p>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Remove Line',
                            message: 'Remove this line from the receipt?',
                            confirmLabel: 'Remove',
                            variant: 'danger',
                          });

                          if (confirmed) {
                            const { removeReceiptLineAction } = await import('../../actions');
                            try {
                              await removeReceiptLineAction(line.id);
                              toast.success('Line removed');
                              router.refresh();
                            } catch (error) {
                              toast.error('Failed to remove line');
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
              ))}
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

