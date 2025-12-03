'use client';

import { AlertTriangle, ArrowDown, ArrowUp, RefreshCw, Construction, X } from 'lucide-react';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type DiscrepancyType = 'NONE' | 'SHORT' | 'OVER' | 'DAMAGE' | 'SUBSTITUTION';

interface MismatchItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  discrepancy: DiscrepancyType;
  unit: string | null;
}

interface MismatchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: MismatchItem[];
  onProceedAnyway?: () => void;
}

function getDiscrepancyIcon(type: DiscrepancyType) {
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

function getDiscrepancyBadgeVariant(type: DiscrepancyType) {
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

function getDiscrepancyLabel(type: DiscrepancyType, ordered: number, received: number) {
  switch (type) {
    case 'SHORT':
      return `Short (${ordered - received} missing)`;
    case 'OVER':
      return `Over (+${received - ordered} extra)`;
    case 'DAMAGE':
      return 'Damaged';
    case 'SUBSTITUTION':
      return 'Substitution';
    default:
      return 'Unknown';
  }
}

export function MismatchPanel({ isOpen, onClose, items, onProceedAnyway }: MismatchPanelProps) {
  const shortItems = items.filter((i) => i.discrepancy === 'SHORT');
  const overItems = items.filter((i) => i.discrepancy === 'OVER');
  const damageItems = items.filter((i) => i.discrepancy === 'DAMAGE');
  const substitutionItems = items.filter((i) => i.discrepancy === 'SUBSTITUTION');

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Review Discrepancies"
      description={`${items.length} item${items.length !== 1 ? 's' : ''} with quantity mismatches`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          {onProceedAnyway && (
            <Button variant="primary" onClick={onProceedAnyway}>
              Proceed Anyway
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Placeholder Banner */}
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <Construction className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Mismatch Resolution Coming Soon
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Full mismatch logging and resolution workflow is under development.
                For now, you can review discrepancies here and proceed with receiving.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Short</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
              {shortItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium text-sky-800 dark:text-sky-200">Over</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-sky-900 dark:text-sky-100">
              {overItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium text-rose-800 dark:text-rose-200">Damage</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">
              {damageItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subst.</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {substitutionItems.length}
            </p>
          </div>
        </div>

        {/* Discrepancy List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Items with Discrepancies
          </h4>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {items.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.itemName}
                  </p>
                  {item.itemSku && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.itemSku}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span>Ordered: {item.orderedQuantity}</span>
                    <span>Received: {item.receivedQuantity}</span>
                  </div>
                </div>
                <Badge variant={getDiscrepancyBadgeVariant(item.discrepancy) as any} className="gap-1 ml-3">
                  {getDiscrepancyIcon(item.discrepancy)}
                  {getDiscrepancyLabel(item.discrepancy, item.orderedQuantity, item.receivedQuantity)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder Actions */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Future Actions (Coming Soon)
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Log discrepancy reason per item
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Request credit from supplier
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Reorder short items
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Attach photos of damaged goods
            </li>
          </ul>
        </div>
      </div>
    </SlideOver>
  );
}

