'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for managing ProductDetailDrawer state
 * Provides consistent drawer behavior across different pages/components
 * 
 * Usage:
 * ```tsx
 * const { selectedProductId, isOpen, openDrawer, closeDrawer } = useProductDrawer();
 * 
 * <button onClick={() => openDrawer(product.id)}>View Product</button>
 * 
 * <ProductDetailDrawer
 *   productId={selectedProductId}
 *   isOpen={isOpen}
 *   onClose={closeDrawer}
 * />
 * ```
 */
export function useProductDrawer() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const openDrawer = useCallback((productId: string | null | undefined) => {
    if (productId) {
      setSelectedProductId(productId);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedProductId(null);
  }, []);

  return {
    selectedProductId,
    isOpen: !!selectedProductId,
    openDrawer,
    closeDrawer,
  };
}

