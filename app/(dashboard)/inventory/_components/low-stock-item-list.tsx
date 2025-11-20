'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, AlertTriangle, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';

import { StockLevelDialog } from './stock-level-dialog';

interface InventoryLocation {
  locationId: string;
  quantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  maxStock: number | null;
  location: { id: string; name: string; code: string | null };
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  totalStock: number;
  locationCount: number;
  isLowStock: boolean;
  lowStockLocations: string[];
  inventory: InventoryLocation[];
}

interface LowStockItemListProps {
  items: InventoryItem[];
  locations: { id: string; name: string; code: string | null }[];
  canManage: boolean;
  hasActiveFilters: boolean;
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function LowStockItemList({
  items,
  locations,
  canManage,
  hasActiveFilters,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: LowStockItemListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingStock, setEditingStock] = useState<{
    item: { id: string; name: string };
    location: { 
      id: string; 
      name: string; 
      reorderPoint: number | null; 
      reorderQuantity: number | null;
      maxStock: number | null;
    };
  } | null>(null);

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc');
    }
    
    params.delete('page');
    router.push(`/inventory?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/inventory?${params.toString()}`);
  };

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => {
    const isActive = currentSort === column;
    const isAsc = currentSortOrder === 'asc';

    return (
      <th 
        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive && (
            <>
              {isAsc ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </>
          )}
          {!isActive && <span className="h-3 w-3" />}
        </div>
      </th>
    );
  };

  if (items.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "No items found" : "No items yet"}
          description={hasActiveFilters ? "Try adjusting your search or filters" : "Add items to your catalog to start tracking inventory levels across your locations."}
          action={
            !hasActiveFilters ? (
              <Link 
                href="/supplier-catalog"
                className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none dark:focus:ring-offset-slate-900 bg-sky-600 text-white hover:bg-sky-700 hover:shadow-md active:scale-[0.98] focus:ring-sky-500 dark:bg-sky-600 dark:hover:bg-sky-700 px-4 py-2 text-sm min-h-[44px]"
              >
                Browse Supplier Catalog
              </Link>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          {totalItems} {totalItems === 1 ? 'item' : 'items'} in inventory
        </span>
        {totalItems > itemsPerPage && (
          <span>
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <SortableHeader column="name" label="Item Name" />
                <SortableHeader column="sku" label="SKU" />
                <SortableHeader column="stock" label="Total Stock" />
                <SortableHeader column="locations" label="Locations" />
                <SortableHeader column="status" label="Status" />
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((item) => {
                const isExpanded = expandedRows.has(item.id);

                return (
                  <React.Fragment key={item.id}>
                    {/* Parent Row */}
                    <tr
                      id={item.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {/* Expand/Collapse Button */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(item.id)}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Item Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {item.sku || '-'}
                        </span>
                      </td>

                      {/* Total Stock */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-semibold ${
                            item.isLowStock 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.totalStock}
                          </span>
                          {item.isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                      </td>

                      {/* Location Count */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                          {item.locationCount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {item.isLowStock ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                            Good
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (
                            <Link 
                              href={`/orders/new?item=${item.id}`}
                              className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none dark:focus:ring-offset-slate-900 border-2 border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm active:scale-[0.98] focus:ring-slate-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/50 dark:hover:border-slate-500 px-3 py-1.5 text-xs min-h-[36px]"
                            >
                              Order
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Location Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50 dark:bg-slate-900/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="ml-8 space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                              Stock by Location
                            </h4>
                            
                            {item.inventory && item.inventory.length > 0 ? (
                              <div className="grid gap-3">
                                {item.inventory.map((inv) => {
                                  const isLowAtLocation = inv.reorderPoint !== null && inv.quantity < inv.reorderPoint;
                                  
                                  return (
                                    <div
                                      key={inv.locationId}
                                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-slate-900 dark:text-white">
                                            {inv.location.name}
                                            {inv.location.code && (
                                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                                ({inv.location.code})
                                              </span>
                                            )}
                                          </span>
                                          {isLowAtLocation && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                                              <AlertTriangle className="h-3 w-3" />
                                              Low
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-600 dark:text-slate-400">
                                          <span>Quantity: <span className="font-semibold">{inv.quantity}</span></span>
                                          {inv.reorderPoint !== null && (
                                            <span>Reorder at: <span className="font-semibold">{inv.reorderPoint}</span></span>
                                          )}
                                          {inv.maxStock !== null && (
                                            <span>Max: <span className="font-semibold">{inv.maxStock}</span></span>
                                          )}
                                          {inv.reorderQuantity !== null && (
                                            <span>Reorder qty: <span className="font-semibold">{inv.reorderQuantity}</span></span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {canManage && (
                                        <div className="flex gap-2">
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => setEditingStock({
                                              item: { id: item.id, name: item.name },
                                              location: {
                                                id: inv.locationId,
                                                name: inv.location.name,
                                                reorderPoint: inv.reorderPoint,
                                                reorderQuantity: inv.reorderQuantity,
                                                maxStock: inv.maxStock,
                                              }
                                            })}
                                          >
                                            Edit Limits
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                No inventory locations configured for this item.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      {/* Edit Dialog */}
      {editingStock && (
        <StockLevelDialog
          isOpen={true}
          onClose={() => setEditingStock(null)}
          item={editingStock.item}
          location={editingStock.location}
        />
      )}
    </div>
  );
}
