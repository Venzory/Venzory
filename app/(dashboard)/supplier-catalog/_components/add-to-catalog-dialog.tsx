'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { addToCatalogAction } from '../actions';
import { formatCurrency } from '@/lib/utils';

interface SupplierOffer {
  id: string;
  globalSupplierId: string;
  supplierSku: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty: number | null;
  globalSupplier: {
    id: string;
    name: string;
  };
}

interface AddToCatalogDialogProps {
  productId: string;
  productName: string;
  offers: SupplierOffer[];
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function AddToCatalogDialog({
  productId,
  productName,
  offers,
  trigger,
  defaultOpen = false,
}: AddToCatalogDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedSupplier, setSelectedSupplier] = useState(offers[0]?.globalSupplierId || '');
  const [state, formAction] = useFormState(addToCatalogAction, null);

  // Close dialog on success
  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      // Redirect to my items with the new item highlighted
      router.push(`/my-items?highlight=${state.itemId}`);
    }
  }, [state, router]);

  if (!isOpen && trigger) {
    return (
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  const selectedOffer = offers.find(o => o.globalSupplierId === selectedSupplier);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Add to My Items
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {productName}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="p-6 space-y-5">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="globalSupplierId" value={selectedSupplier} />

          {/* Error Message */}
          {state?.error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
            </div>
          )}

          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Supplier *
            </label>
            <div className="space-y-2">
              {offers.map((offer) => (
                <label
                  key={offer.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    selectedSupplier === offer.globalSupplierId
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplier"
                    value={offer.globalSupplierId}
                    checked={selectedSupplier === offer.globalSupplierId}
                    onChange={() => setSelectedSupplier(offer.globalSupplierId)}
                    className="h-4 w-4 text-brand focus:ring-brand"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {offer.globalSupplier.name}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      {offer.unitPrice !== null && (
                        <span className="font-medium text-brand">
                          {formatCurrency(Number(offer.unitPrice), offer.currency || 'EUR')}
                        </span>
                      )}
                      {offer.supplierSku && (
                        <span>SKU: {offer.supplierSku}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={productName}
              required
              maxLength={255}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              You can customize the name for your practice
            </p>
          </div>

          {/* SKU */}
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Your SKU (Optional)
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              defaultValue={selectedOffer?.supplierSku || ''}
              maxLength={64}
              placeholder="Enter your internal SKU"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Unit (Optional)
            </label>
            <input
              type="text"
              id="unit"
              name="unit"
              maxLength={32}
              placeholder="e.g., box, case, piece"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              maxLength={500}
              rows={3}
              placeholder="Add any practice-specific notes"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Adding...' : 'Add to My Items'}
    </Button>
  );
}

