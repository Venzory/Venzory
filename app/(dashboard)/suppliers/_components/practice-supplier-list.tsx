'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, ExternalLink, ShoppingCart, Plus } from 'lucide-react';

import type { PracticeSupplierWithRelations, GlobalSupplier } from '@/src/domain/models/suppliers';
import { EmptyState } from '@/components/ui/empty-state';
import { SupplierStatusBadges } from './supplier-status-badges';
import { AddSupplierModal } from './add-supplier-modal';
import { getPracticeSupplierDisplay } from '../_utils/supplier-display';
import { DataTable } from '@/components/ui/data-table';

interface PracticeSupplierListProps {
  suppliers: PracticeSupplierWithRelations[];
  globalSuppliers: GlobalSupplier[];
  canManage: boolean;
}

export function PracticeSupplierList({ suppliers, globalSuppliers, canManage }: PracticeSupplierListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const linkedSupplierIds = new Set(
    suppliers.map((ps) => ps.globalSupplierId)
  );

  const columns = [
    {
      accessorKey: 'name',
      header: 'Supplier',
      cell: (practiceSupplier: PracticeSupplierWithRelations) => {
        const { name: displayName } = getPracticeSupplierDisplay(practiceSupplier);
        const supplier = practiceSupplier.globalSupplier;
        return (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {displayName}
            </div>
            {practiceSupplier.customLabel && supplier?.name && (
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Also known as: {supplier.name}
              </p>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'accountNumber',
      header: 'Account #',
      cell: (ps: PracticeSupplierWithRelations) => ps.accountNumber ? (
        <span className="font-medium text-slate-900 dark:text-slate-100">{ps.accountNumber}</span>
      ) : <span className="text-slate-400 italic">-</span>
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: (ps: PracticeSupplierWithRelations) => {
        const supplier = ps.globalSupplier;
        if (!supplier) return <span className="text-slate-400">-</span>;
        
        return (
          <div className="space-y-1 text-sm">
            {supplier.email && (
              <div>
                <a href={`mailto:${supplier.email}`} className="text-sky-600 hover:underline dark:text-sky-400">
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.phone && (
              <div>
                <a href={`tel:${supplier.phone}`} className="text-sky-600 hover:underline dark:text-sky-400">
                  {supplier.phone}
                </a>
              </div>
            )}
            {supplier.website && (
                <div>
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline dark:text-sky-400 inline-flex items-center gap-1">
                        Website <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'orderingNotes',
      header: 'Ordering Notes',
      cell: (ps: PracticeSupplierWithRelations) => ps.orderingNotes ? (
        <div className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400" title={ps.orderingNotes}>
          {ps.orderingNotes}
        </div>
      ) : <span className="text-slate-400 italic">-</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (ps: PracticeSupplierWithRelations) => (
        <SupplierStatusBadges
          isPreferred={ps.isPreferred}
          isBlocked={ps.isBlocked}
        />
      )
    },
    {
      accessorKey: 'actions',
      header: '',
      className: 'text-right',
      cell: (ps: PracticeSupplierWithRelations) => (
        <div className="flex items-center justify-end gap-2">
          {!ps.isBlocked && (
            <Link
              href={`/orders/new?supplierId=${ps.id}`}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <ShoppingCart className="mr-1.5 h-3 w-3" />
              Order
            </Link>
          )}
          {canManage && (
            <Link
              href={`/suppliers/${ps.id}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
            >
              Details
            </Link>
          )}
        </div>
      )
    }
  ];

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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
            <DataTable columns={columns} data={suppliers} className="border-0" />
        </div>
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

