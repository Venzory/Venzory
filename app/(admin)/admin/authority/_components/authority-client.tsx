'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { TriageList, TriageFiltersBar } from './triage-list';
import { InspectorPanel } from './inspector-panel';
import { ProductSearch } from './product-search';
import { MergeDialog } from './merge-dialog';
import { useKeyboardShortcuts, KeyboardHints } from './keyboard-handler';
import { 
  getTriageItems, 
  getItemDetails, 
  confirmMatch, 
  markIgnored,
  type TriageItem, 
  type TriageFilters 
} from '../actions';

interface AuthorityClientProps {
  initialItems: TriageItem[];
  initialTotal: number;
  suppliers: Array<{ id: string; name: string; pendingCount: number }>;
}

type PanelMode = 'inspect' | 'reassign' | 'create' | 'merge' | null;

export function AuthorityClient({ 
  initialItems, 
  initialTotal,
  suppliers,
}: AuthorityClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [items, setItems] = useState<TriageItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems.length > 0 ? initialItems[0].id : null
  );
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('inspect');
  
  // Filters
  const [filters, setFilters] = useState<TriageFilters>({});
  const [isFiltering, startFilterTransition] = useTransition();

  // Get selected item
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  // Load item details when selection changes
  useEffect(() => {
    if (!selectedId) {
      setItemDetails(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingDetails(true);

    getItemDetails(selectedId)
      .then((details) => {
        if (!isCancelled) {
          setItemDetails(details);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedId]);

  // Refresh items after action
  const refreshItems = useCallback(async () => {
    startFilterTransition(async () => {
      try {
        const { items: newItems, total: newTotal } = await getTriageItems(filters, 50, 0);
        setItems(newItems);
        setTotal(newTotal);
        
        // Select first item if current selection is gone
        if (selectedId && !newItems.find((i) => i.id === selectedId)) {
          setSelectedId(newItems.length > 0 ? newItems[0].id : null);
        }
      } catch (error) {
        console.error('Failed to refresh items:', error);
      }
    });
  }, [filters, selectedId]);

  // Apply filters
  const applyFilters = useCallback((newFilters: Partial<TriageFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    startFilterTransition(async () => {
      try {
        const { items: newItems, total: newTotal } = await getTriageItems(updatedFilters, 50, 0);
        setItems(newItems);
        setTotal(newTotal);
        setSelectedId(newItems.length > 0 ? newItems[0].id : null);
      } catch (error) {
        console.error('Failed to apply filters:', error);
      }
    });
  }, [filters]);

  // Action handlers
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setPanelMode('inspect');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedId) return;
    
    const result = await confirmMatch(selectedId);
    if (result.success) {
      toast({ title: 'Match confirmed', description: 'Item removed from triage queue.' });
      refreshItems();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }, [selectedId, toast, refreshItems]);

  const handleReassign = useCallback(() => {
    if (selectedId) {
      setPanelMode('reassign');
    }
  }, [selectedId]);

  const handleCreate = useCallback(() => {
    if (selectedId) {
      setPanelMode('create');
    }
  }, [selectedId]);

  const handleMerge = useCallback(() => {
    if (selectedId) {
      setPanelMode('merge');
    }
  }, [selectedId]);

  const handleIgnore = useCallback(async () => {
    if (!selectedId) return;
    
    const result = await markIgnored(selectedId);
    if (result.success) {
      toast({ title: 'Item ignored', description: 'Item has been deactivated.' });
      refreshItems();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }, [selectedId, toast, refreshItems]);

  const handleSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleActionComplete = useCallback(() => {
    setPanelMode('inspect');
    refreshItems();
    router.refresh();
  }, [refreshItems, router]);

  const handlePanelClose = useCallback(() => {
    setPanelMode('inspect');
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    itemIds: items.map((i) => i.id),
    selectedId,
    onSelect: handleSelect,
    onConfirm: handleConfirm,
    onReassign: handleReassign,
    onCreate: handleCreate,
    onMerge: handleMerge,
    onIgnore: handleIgnore,
    onSearch: handleSearch,
    enabled: true,
    isPanelOpen: panelMode === 'reassign' || panelMode === 'create' || panelMode === 'merge',
  });

  // Render panel content based on mode
  const renderPanel = () => {
    if (panelMode === 'reassign' && selectedItem) {
      return (
        <ProductSearch
          supplierItemId={selectedItem.id}
          currentProductId={selectedItem.productId}
          supplierItemName={selectedItem.supplierItemName}
          onComplete={handleActionComplete}
          onCancel={handlePanelClose}
          className="h-full"
        />
      );
    }

    if (panelMode === 'create' && selectedItem) {
      return (
        <ProductSearch
          supplierItemId={selectedItem.id}
          currentProductId={selectedItem.productId}
          supplierItemName={selectedItem.supplierItemName}
          onComplete={handleActionComplete}
          onCancel={handlePanelClose}
          className="h-full"
        />
      );
    }

    if (panelMode === 'merge' && selectedItem) {
      return (
        <MergeDialog
          sourceProductId={selectedItem.productId}
          sourceProductName={selectedItem.productName}
          sourceProductGtin={selectedItem.productGtin}
          onComplete={handleActionComplete}
          onCancel={handlePanelClose}
          className="h-full"
        />
      );
    }

    return (
      <InspectorPanel
        item={selectedItem}
        itemDetails={itemDetails}
        isLoading={isLoadingDetails}
        onAction={(action) => {
          if (action === 'confirm') {
            handleConfirm();
          } else if (action === 'reassign') {
            handleReassign();
          } else if (action === 'create') {
            handleCreate();
          } else if (action === 'merge') {
            handleMerge();
          } else if (action === 'ignore') {
            handleIgnore();
          }
        }}
        onClose={() => setSelectedId(null)}
        className="h-full"
      />
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left sidebar - Filters */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 overflow-y-auto dark:border-slate-800 dark:bg-slate-900/50">
        <TriageFiltersBar
          issueType={filters.issueType ?? 'all'}
          supplierId={filters.supplierId ?? ''}
          suppliers={suppliers}
          onIssueTypeChange={(type) => applyFilters({ issueType: type as any })}
          onSupplierChange={(id) => applyFilters({ supplierId: id || undefined })}
          total={total}
        />

        {/* Search input */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={filters.search ?? ''}
              onChange={(e) => applyFilters({ search: e.target.value || undefined })}
              placeholder="Search items..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <KeyboardHints />
        </div>
      </div>

      {/* Main content - Triage list */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        {isFiltering && (
          <div className="flex items-center justify-center py-2 bg-admin/10">
            <Loader2 className="h-4 w-4 animate-spin text-admin mr-2" />
            <span className="text-xs text-admin">Updating...</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <TriageList
            items={items}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Right panel - Inspector */}
      <div className="w-[400px] flex-shrink-0 border-l border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {renderPanel()}
      </div>
    </div>
  );
}

