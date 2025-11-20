'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, ExternalLink, ShoppingCart, Plus } from 'lucide-react';

import type { PracticeSupplierWithRelations, GlobalSupplier } from '@/src/domain/models/suppliers';
import { EmptyState } from '@/components/ui/empty-state';
import { SupplierStatusBadges } from './supplier-status-badges';
import { AddSupplierModal } from './add-supplier-modal';
import { getPracticeSupplierDisplay } from '../_utils/supplier-display';

interface PracticeSupplierListProps {
  suppliers: PracticeSupplierWithRelations[];
  globalSuppliers: GlobalSupplier[];
  canManage: boolean;
}

export function PracticeSupplierList({ suppliers, globalSuppliers, canManage }: PracticeSupplierListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Create a set of already linked global supplier IDs
  const linkedSupplierIds = new Set(
    suppliers.map((ps) => ps.globalSupplierId)
  );

  if (suppliers.length === 0) {
    return (
      <>
        <EmptyState
          icon={Store}
          title="No suppliers linked"
          description={
            canManage
              ? 'Get started by linking a supplier to your practice.'
              : 'Suppliers will be added by administrators to manage vendor relationships.'
          }
          action={
            canManage ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 hover:shadow dark:bg-sky-600 dark:hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            ) : undefined
          }
        />
        
        {canManage && isAddModalOpen && (
          <AddSupplierModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            globalSuppliers={globalSuppliers}
            linkedSupplierIds={linkedSupplierIds}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Header with Add button */}
      {canManage && (
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 hover:shadow dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        </div>
      )}

      <div className="space-y-5">
      {suppliers.map((practiceSupplier) => {
        const { name: displayName } = getPracticeSupplierDisplay(practiceSupplier);
        const supplier = practiceSupplier.globalSupplier;

        return (
          <div
            key={practiceSupplier.id}
            id={practiceSupplier.id}
            className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none"
          >
            <div className="p-6">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div className="flex-1 space-y-4">
                  {/* Header with name and badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                          {displayName}
                        </h2>
                        <SupplierStatusBadges
                          isPreferred={practiceSupplier.isPreferred}
                          isBlocked={practiceSupplier.isBlocked}
                        />
                      </div>
                      {practiceSupplier.customLabel && supplier?.name && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          Also known as: {supplier.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Account number - prominent if available */}
                  {practiceSupplier.accountNumber && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-950/60">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Account #:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {practiceSupplier.accountNumber}
                      </span>
                    </div>
                  )}

                  {/* Contact information */}
                  {supplier && (supplier.email || supplier.phone || supplier.website) && (
                    <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-2">
                        {supplier.email && (
                          <div>
                            <span className="font-medium">Email: </span>
                            <a
                              href={`mailto:${supplier.email}`}
                              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              {supplier.email}
                            </a>
                          </div>
                        )}
                        {supplier.phone && (
                          <div>
                            <span className="font-medium">Phone: </span>
                            <a
                              href={`tel:${supplier.phone}`}
                              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              {supplier.phone}
                            </a>
                          </div>
                        )}
                        {supplier.website && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Website: </span>
                            <a
                              href={supplier.website}
                              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {supplier.website}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ordering notes */}
                  {practiceSupplier.orderingNotes && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="font-medium text-slate-900 dark:text-slate-200">
                        Ordering Notes
                      </p>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        {practiceSupplier.orderingNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5 md:min-w-[140px]">
                  {!practiceSupplier.isBlocked && (
                    <Link
                      href={`/orders/new?supplierId=${practiceSupplier.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 hover:shadow dark:bg-sky-600 dark:hover:bg-sky-700"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Create Order
                    </Link>
                  )}
                  {canManage && (
                    <Link
                      href={`/suppliers/${practiceSupplier.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

      {/* Add Supplier Modal */}
      {canManage && isAddModalOpen && (
        <AddSupplierModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          globalSuppliers={globalSuppliers}
          linkedSupplierIds={linkedSupplierIds}
        />
      )}
    </>
  );
}

