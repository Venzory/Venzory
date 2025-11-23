'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { createOrdersFromLowStockAction } from '../actions';
import type { LowStockInfo } from '@/src/domain/models';

interface ReorderListProps {
  items: LowStockInfo[];
  canOrder: boolean;
}

interface GroupedItem {
  itemId: string;
  itemName: string;
  locations: LowStockInfo[];
  totalSuggested: number;
}

export function ReorderList({ items, canOrder }: ReorderListProps) {
  const router = useRouter();
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group items by itemId
  const groupedItems = useMemo(() => {
    const groups = new Map<string, GroupedItem>();

    for (const item of items) {
      if (!groups.has(item.itemId)) {
        groups.set(item.itemId, {
          itemId: item.itemId,
          itemName: item.itemName,
          locations: [],
          totalSuggested: 0,
        });
      }
      const group = groups.get(item.itemId)!;
      group.locations.push(item);
      group.totalSuggested += item.suggestedOrderQuantity;
    }

    return Array.from(groups.values());
  }, [items]);

  const toggleSelectAll = () => {
    if (selectedItemIds.size === groupedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(groupedItems.map(i => i.itemId)));
    }
  };

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItemIds(newSet);
  };

  const handleCreateOrders = async () => {
    if (selectedItemIds.size === 0) return;

    setIsSubmitting(true);
    try {
      const result = await createOrdersFromLowStockAction(Array.from(selectedItemIds));
      
      if (result.success) {
        toast.success(result.message);
        router.push('/orders');
      } else {
        toast.error(result.error || 'Failed to create orders');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={Package}
          title="All stocked up!"
          description="No items are currently below their minimum stock levels."
          action={
            <Button variant="secondary" onClick={() => router.push('/inventory')}>
              View Inventory
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800"
            checked={selectedItemIds.size === groupedItems.length && groupedItems.length > 0}
            onChange={toggleSelectAll}
            disabled={isSubmitting}
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Select All ({groupedItems.length})
          </span>
        </div>

        {canOrder && (
          <Button
            variant="primary"
            onClick={handleCreateOrders}
            disabled={selectedItemIds.size === 0 || isSubmitting}
            loading={isSubmitting}
          >
            Create Draft Orders ({selectedItemIds.size})
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {groupedItems.map((group) => (
          <div
            key={group.itemId}
            className={`relative overflow-hidden rounded-xl border transition-all ${
              selectedItemIds.has(group.itemId)
                ? 'border-sky-500 bg-sky-50/50 dark:border-sky-500/50 dark:bg-sky-900/10'
                : 'border-slate-200 bg-white hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-700'
            }`}
          >
            <div className="flex items-start p-4 gap-4">
              <div className="pt-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800"
                  checked={selectedItemIds.has(group.itemId)}
                  onChange={() => toggleItem(group.itemId)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">{group.itemName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="h-3 w-3" />
                        Below Minimum
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-500">
                        Total Suggested Order: <span className="font-semibold text-slate-900 dark:text-slate-200">{group.totalSuggested}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Locations Breakdown */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.locations.map((loc) => (
                    <div
                      key={loc.locationId}
                      className="rounded-lg bg-white border border-slate-100 p-3 text-sm dark:bg-slate-950/40 dark:border-slate-800"
                    >
                      <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {loc.locationName}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Current: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{loc.currentQuantity}</span></span>
                        <span className="text-slate-500">Min: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{loc.reorderPoint}</span></span>
                        {loc.maxStock !== null && (
                          <span className="text-slate-500">Max: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{loc.maxStock}</span></span>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Suggested:</span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          {loc.suggestedOrderQuantity}
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

