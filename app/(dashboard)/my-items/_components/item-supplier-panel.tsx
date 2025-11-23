'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, CheckCircle2, X, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { setDefaultSupplierAction } from '../actions';

interface SupplierOption {
  practiceSupplier: {
    id: string;
    customLabel: string | null;
    isPreferred: boolean;
    globalSupplier: {
      name: string;
    };
  };
  supplierItem: {
    id: string;
    supplierSku: string | null;
    unitPrice: number | null;
    currency: string | null;
    minOrderQty: number | null;
  };
  isDefault: boolean;
}

interface SupplierPanelData {
  item: {
    id: string;
    name: string;
    defaultPracticeSupplierId: string | null;
  };
  suppliers: SupplierOption[];
}

interface ItemSupplierPanelProps {
  itemId: string;
  itemName: string;
  trigger?: React.ReactNode;
}

export function ItemSupplierPanel({ itemId, itemName, trigger }: ItemSupplierPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<SupplierPanelData | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/practice/items/${itemId}/suppliers`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Unable to load supplier options');
        }
        return response.json();
      })
      .then((data: SupplierPanelData) => {
        if (cancelled) return;
        setPanelData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, itemId]);

  const suppliers = useMemo(() => panelData?.suppliers ?? [], [panelData]);

  const preferredSupplierId = panelData?.item.defaultPracticeSupplierId;

  const preferredSupplierName = useMemo(() => {
    const match = suppliers.find(
      (option) => option.practiceSupplier.id === preferredSupplierId
    );
    return (
      match?.practiceSupplier.customLabel ||
      match?.practiceSupplier.globalSupplier.name ||
      null
    );
  }, [suppliers, preferredSupplierId]);

  const handleSelectSupplier = (practiceSupplierId: string) => {
    setStatusMessage(undefined);
    startTransition(async () => {
      const result = await setDefaultSupplierAction({
        itemId,
        practiceSupplierId,
      });

      if (result.error) {
        setStatusMessage({ type: 'error', text: result.error });
        return;
      }

      setStatusMessage({ type: 'success', text: result.success ?? 'Updated successfully.' });
      router.refresh();

      setPanelData((prev) =>
        prev
          ? {
              ...prev,
              item: {
                ...prev.item,
                defaultPracticeSupplierId: practiceSupplierId,
              },
              suppliers: prev.suppliers.map((option) => ({
                ...option,
                isDefault: option.practiceSupplier.id === practiceSupplierId,
              })),
            }
          : prev
      );
    });
  };

  if (!isOpen) {
    return (
      <div onClick={() => setIsOpen(true)} className="inline-flex">
        {trigger ?? (
          <Button variant="ghost" size="sm">
            Suppliers
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Supplier Options
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {itemName}
            </h2>
            {preferredSupplierName && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Preferred supplier: {preferredSupplierName}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close supplier panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading supplier options…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && suppliers.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No linked suppliers offer this product yet. Link a supplier to see options here.
            </div>
          )}

          {!isLoading && !error && suppliers.length > 0 && (
            <div className="space-y-4">
              {suppliers.map((option) => {
                const offer = option.supplierItem;
                const supplierLabel =
                  option.practiceSupplier.customLabel ||
                  option.practiceSupplier.globalSupplier.name;

                return (
                  <div
                    key={option.practiceSupplier.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {supplierLabel}
                          </span>
                          {option.isDefault && (
                            <Badge variant="success" className="uppercase tracking-wide">
                              Preferred
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Supplier SKU: {offer.supplierSku || '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        {offer.unitPrice !== null ? (
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(
                              Number(offer.unitPrice),
                              offer.currency || 'EUR'
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            Price unavailable
                          </div>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          MOQ: {offer.minOrderQty ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Setting a preferred supplier speeds up ordering and stock workflows.
                      </div>
                      <Button
                        variant={option.isDefault ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={isPending || option.isDefault}
                        onClick={() => handleSelectSupplier(option.practiceSupplier.id)}
                      >
                        {option.isDefault ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Preferred supplier
                          </>
                        ) : (
                          'Set as Preferred'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {statusMessage && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

