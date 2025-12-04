'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { ProductDetailDrawer } from '@/components/product/product-detail-drawer';
import { CatalogProductList } from './catalog-product-list';
import { AddToCatalogDialog } from './add-to-catalog-dialog';

interface SupplierOffer {
  id: string;
  globalSupplierId?: string;
  supplierName?: string | null;
  supplierSku?: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty?: number | null;
  isPreferred?: boolean;
  globalSupplier?: {
    id: string;
    name: string;
  };
  practiceSupplier?: {
    id: string;
    customLabel: string | null;
    isPreferred: boolean;
    globalSupplier: {
      id: string;
      name: string;
    };
  };
}

interface ProductWithInfo {
  id: string;
  name: string;
  brand: string | null;
  gtin: string | null;
  description: string | null;
  shortDescription?: string | null;
  inCatalog: boolean;
  itemId?: string;
  supplierCount: number;
  lowestPrice: number | null;
  preferredSupplierName?: string | null;
  preferredSupplierPrice?: number | null;
  primaryImageUrl?: string | null;
  offers: SupplierOffer[];
}

interface CatalogWithDrawerProps {
  products: ProductWithInfo[];
  canManage: boolean;
  hasActiveFilters: boolean;
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
}

export function CatalogWithDrawer({
  products,
  canManage,
  hasActiveFilters,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalProducts,
}: CatalogWithDrawerProps) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [addDialogProduct, setAddDialogProduct] = useState<{
    id: string;
    name: string;
    offers: SupplierOffer[];
  } | null>(null);

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProductId(productId);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedProductId(null);
  }, []);

  const handleAddToItems = useCallback((productId: string) => {
    // Close the drawer first
    setSelectedProductId(null);
    
    // Find the product to get its name and original offers
    const product = products.find(p => p.id === productId);
    if (product) {
      setAddDialogProduct({
        id: product.id,
        name: product.name,
        offers: product.offers,
      });
    }
  }, [products]);

  return (
    <>
      <CatalogProductList
        products={products}
        canManage={canManage}
        hasActiveFilters={hasActiveFilters}
        currentSort={currentSort}
        currentSortOrder={currentSortOrder}
        currentPage={currentPage}
        totalPages={totalPages}
        totalProducts={totalProducts}
        onProductSelect={handleProductSelect}
      />

      <ProductDetailDrawer
        productId={selectedProductId}
        isOpen={!!selectedProductId}
        onClose={handleDrawerClose}
        onAddToItems={canManage ? handleAddToItems : undefined}
      />

      {/* Add to Catalog Dialog - triggered from drawer */}
      {addDialogProduct && (
        <AddToCatalogDialog
          productId={addDialogProduct.id}
          productName={addDialogProduct.name}
          offers={addDialogProduct.offers as any}
          defaultOpen={true}
        />
      )}
    </>
  );
}

