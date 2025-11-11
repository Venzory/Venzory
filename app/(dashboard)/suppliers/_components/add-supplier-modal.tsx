'use client';

import { X, Search, Store, Check } from 'lucide-react';
import { useEffect, useState, useActionState } from 'react';
import { toast } from '@/lib/toast';
import type { GlobalSupplier } from '@/src/domain/models/suppliers';
import { linkGlobalSupplierAction } from '../actions';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSuppliers: GlobalSupplier[];
  linkedSupplierIds: Set<string>;
  onSuccess?: () => void;
}

export function AddSupplierModal({
  isOpen,
  onClose,
  globalSuppliers,
  linkedSupplierIds,
  onSuccess,
}: AddSupplierModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(linkGlobalSupplierAction, null);

  // Filter suppliers based on search query
  const filteredSuppliers = globalSuppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate linked and unlinked suppliers
  const unlinkedSuppliers = filteredSuppliers.filter(
    (s) => !linkedSupplierIds.has(s.id)
  );
  const alreadyLinkedSuppliers = filteredSuppliers.filter(
    (s) => linkedSupplierIds.has(s.id)
  );

  // Handle successful link
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setSearchQuery('');
      setSelectedSupplierId(null);
      onSuccess?.();
      onClose();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onClose, onSuccess]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPending) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isPending]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedSupplierId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (formData: FormData) => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier to link.');
      return;
    }
    formData.set('globalSupplierId', selectedSupplierId);
    formAction(formData);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in"
      onClick={!isPending ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="dialog-title"
              className="text-xl font-semibold text-slate-900 dark:text-white"
            >
              Add Supplier
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Link an existing supplier to your practice
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suppliers by name or email..."
              disabled={isPending}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>
        </div>

        {/* Content - Scrollable supplier list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <form action={handleSubmit}>
            {/* Available Suppliers */}
            {unlinkedSuppliers.length > 0 && (
              <div className="space-y-2">
                {unlinkedSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    disabled={isPending}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSupplierId === supplier.id
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {supplier.name}
                          </h3>
                          {selectedSupplierId === supplier.id && (
                            <Check className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                          )}
                        </div>
                        {(supplier.email || supplier.phone) && (
                          <div className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-400">
                            {supplier.email && <div>{supplier.email}</div>}
                            {supplier.phone && <div>{supplier.phone}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Already Linked Suppliers */}
            {alreadyLinkedSuppliers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Already Linked
                </h3>
                <div className="space-y-2">
                  {alreadyLinkedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {supplier.name}
                          </h3>
                          {supplier.email && (
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty States */}
            {filteredSuppliers.length === 0 && globalSuppliers.length === 0 && (
              <div className="text-center py-12">
                <Store className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                  No suppliers available
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  There are no global suppliers in the system yet.
                </p>
              </div>
            )}

            {filteredSuppliers.length === 0 && globalSuppliers.length > 0 && (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                  No suppliers found
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Try adjusting your search query.
                </p>
              </div>
            )}

            {unlinkedSuppliers.length === 0 && alreadyLinkedSuppliers.length > 0 && filteredSuppliers.length > 0 && (
              <div className="text-center py-8 mb-4">
                <Check className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
                <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                  All matching suppliers are already linked
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {searchQuery ? 'Try a different search query.' : 'You have linked all available suppliers.'}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedSupplierId) {
                const formData = new FormData();
                formData.set('globalSupplierId', selectedSupplierId);
                formAction(formData);
              } else {
                toast.error('Please select a supplier to link.');
              }
            }}
            disabled={isPending || !selectedSupplierId}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {isPending ? 'Linking...' : 'Link Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

