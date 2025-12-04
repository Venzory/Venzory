'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  RefreshCw,
  Check,
  Clock,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReceivingMismatchWithRelations } from '@/src/services/receiving';
import { MismatchDetailDrawer } from './mismatch-detail-drawer';

interface MismatchesClientProps {
  initialMismatches: ReceivingMismatchWithRelations[];
  suppliers: Array<{ id: string; name: string }>;
  initialFilters: {
    status?: string;
    type?: string;
    practiceSupplierId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

function getMismatchTypeIcon(type: string) {
  switch (type) {
    case 'SHORT':
      return <ArrowDown className="h-4 w-4" />;
    case 'OVER':
      return <ArrowUp className="h-4 w-4" />;
    case 'DAMAGE':
      return <AlertTriangle className="h-4 w-4" />;
    case 'SUBSTITUTION':
      return <RefreshCw className="h-4 w-4" />;
    default:
      return null;
  }
}

function getMismatchTypeBadgeVariant(type: string) {
  switch (type) {
    case 'SHORT':
      return 'warning';
    case 'OVER':
      return 'info';
    case 'DAMAGE':
      return 'destructive';
    case 'SUBSTITUTION':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getMismatchStatusBadge(status: string) {
  switch (status) {
    case 'OPEN':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Open
        </Badge>
      );
    case 'RESOLVED':
      return (
        <Badge variant="success" className="gap-1">
          <Check className="h-3 w-3" />
          Resolved
        </Badge>
      );
    case 'NEEDS_SUPPLIER_CORRECTION':
      return (
        <Badge variant="destructive" className="gap-1">
          <Building2 className="h-3 w-3" />
          Needs Supplier
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function MismatchesClient({
  initialMismatches,
  suppliers,
  initialFilters,
}: MismatchesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mismatches, setMismatches] = useState(initialMismatches);
  const [selectedMismatch, setSelectedMismatch] = useState<ReceivingMismatchWithRelations | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter state
  const [status, setStatus] = useState(initialFilters.status || '');
  const [type, setType] = useState(initialFilters.type || '');
  const [supplierId, setSupplierId] = useState(initialFilters.practiceSupplierId || '');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');

  // Apply filters
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (supplierId) params.set('supplier', supplierId);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    router.push(`/receiving/mismatches?${params.toString()}`);
  }, [status, type, supplierId, dateFrom, dateTo, router]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setStatus('');
    setType('');
    setSupplierId('');
    setDateFrom('');
    setDateTo('');
    router.push('/app/receiving/mismatches');
  }, [router]);

  // Open detail drawer
  const openDetail = useCallback((mismatch: ReceivingMismatchWithRelations) => {
    setSelectedMismatch(mismatch);
    setIsDrawerOpen(true);
  }, []);

  // Refresh after action
  const handleMismatchUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  const hasActiveFilters = status || type || supplierId || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-card-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="NEEDS_SUPPLIER_CORRECTION">Needs Supplier</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Types</option>
              <option value="SHORT">Short</option>
              <option value="OVER">Over</option>
              <option value="DAMAGE">Damage</option>
              <option value="SUBSTITUTION">Substitution</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={applyFilters}>
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        {mismatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-slate-400 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              No Mismatches Found
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Discrepancies will appear here when logged during receiving'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Ordered
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {mismatches.map((mismatch) => (
                  <tr
                    key={mismatch.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => openDetail(mismatch)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(mismatch.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {mismatch.order?.reference || `#${mismatch.orderId?.slice(0, 8) || 'N/A'}`}
                      </span>
                      {mismatch.practiceSupplier && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mismatch.practiceSupplier.customLabel ||
                            mismatch.practiceSupplier.globalSupplier?.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {mismatch.item.name}
                      </span>
                      {mismatch.item.sku && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mismatch.item.sku}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={getMismatchTypeBadgeVariant(mismatch.type) as any}
                        className="gap-1"
                      >
                        {getMismatchTypeIcon(mismatch.type)}
                        {mismatch.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {mismatch.orderedQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {mismatch.receivedQuantity}
                      </span>
                      <span
                        className={`ml-1 text-xs ${
                          mismatch.varianceQuantity > 0
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        ({mismatch.varianceQuantity > 0 ? '+' : ''}
                        {mismatch.varianceQuantity})
                      </span>
                    </td>
                    <td className="px-4 py-3">{getMismatchStatusBadge(mismatch.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(mismatch);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TODO: Add "Export to CSV" for supplier communication */}
      {/* TODO: Add bulk actions for resolving multiple mismatches */}

      {/* Detail Drawer */}
      <MismatchDetailDrawer
        mismatch={selectedMismatch}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedMismatch(null);
        }}
        onUpdated={handleMismatchUpdated}
      />
    </div>
  );
}

