'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Barcode, 
  Search,
  ChevronDown,
  ExternalLink 
} from 'lucide-react';
import type { SupplierItem, MatchMethod } from '@prisma/client';

type ValidationItem = SupplierItem & {
  product: {
    id: string;
    name: string;
    gtin: string | null;
    brand: string | null;
  };
};

interface LogTableProps {
  items: ValidationItem[];
}

export function LogTable({ items }: LogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      item.supplierSku?.toLowerCase().includes(search) ||
      item.supplierName?.toLowerCase().includes(search) ||
      item.product.name.toLowerCase().includes(search) ||
      item.product.gtin?.toLowerCase().includes(search)
    );
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          All products validated successfully. No issues to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by SKU, name, or GTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Match Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Updated
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredItems.map((item) => (
              <>
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.needsReview ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.supplierName || item.product.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {item.supplierSku && <span>SKU: {item.supplierSku}</span>}
                        {item.product.gtin && (
                          <span className="flex items-center gap-1">
                            <Barcode className="h-3 w-3" />
                            {item.product.gtin}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge needsReview={item.needsReview} />
                  </td>
                  <td className="px-4 py-3">
                    <MatchMethodBadge method={item.matchMethod} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceIndicator confidence={item.matchConfidence?.toNumber() ?? null} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Data</h4>
                          <dl className="mt-2 space-y-1 text-sm">
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">Name:</dt>
                              <dd className="text-slate-900 dark:text-white">{item.supplierName || '-'}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">SKU:</dt>
                              <dd className="text-slate-900 dark:text-white">{item.supplierSku || '-'}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">Description:</dt>
                              <dd className="text-slate-900 dark:text-white">{item.supplierDescription || '-'}</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Matched Product</h4>
                          <dl className="mt-2 space-y-1 text-sm">
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">Name:</dt>
                              <dd className="text-slate-900 dark:text-white">{item.product.name}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">GTIN:</dt>
                              <dd className="font-mono text-slate-900 dark:text-white">{item.product.gtin || '-'}</dd>
                            </div>
                            <div className="flex">
                              <dt className="w-24 text-slate-500 dark:text-slate-400">Brand:</dt>
                              <dd className="text-slate-900 dark:text-white">{item.product.brand || '-'}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      {item.needsReview && (
                        <div className="mt-4 flex justify-end gap-2">
                          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                            Report Issue
                          </button>
                          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                            Confirm Match
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ needsReview }: { needsReview: boolean }) {
  if (needsReview) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        Needs Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </span>
  );
}

function MatchMethodBadge({ method }: { method: MatchMethod }) {
  const config: Record<MatchMethod, { label: string; color: string }> = {
    MANUAL: { label: 'Manual', color: 'slate' },
    EXACT_GTIN: { label: 'GTIN Match', color: 'emerald' },
    FUZZY_NAME: { label: 'Fuzzy Match', color: 'amber' },
    BARCODE_SCAN: { label: 'Barcode', color: 'sky' },
    SUPPLIER_MAPPED: { label: 'Supplier Map', color: 'violet' },
  };

  const { label, color } = config[method] || { label: method, color: 'slate' };

  return (
    <span className={`rounded-full bg-${color}-50 px-2.5 py-0.5 text-xs font-medium text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300`}>
      {label}
    </span>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  const percentage = Math.round(confidence * 100);
  const color = percentage >= 90 ? 'emerald' : percentage >= 70 ? 'amber' : 'rose';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full bg-${color}-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium text-${color}-600 dark:text-${color}-400`}>
        {percentage}%
      </span>
    </div>
  );
}

