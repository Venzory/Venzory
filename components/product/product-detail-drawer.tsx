'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Building2, Tag, Truck, AlertCircle, CheckCircle2, Crown, DollarSign } from 'lucide-react';

import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

// Types for drawer data
export interface ProductMedia {
  id: string;
  url: string;
  isPrimary: boolean;
  type: string;
}

export interface ProductPackaging {
  level: string;
  childCount: number | null;
  gtin: string | null;
}

export interface SupplierOffer {
  id: string;
  supplierName: string;
  supplierSku: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty: number | null;
  leadTimeDays: number | null;
  packSize: string | null;
  isPreferred: boolean;
  isCheapest: boolean;
  hasContract: boolean;
  practiceSupplier: {
    id: string;
    customLabel: string | null;
    isPreferred: boolean;
    globalSupplier: {
      id: string;
      name: string;
    };
  };
}

export interface ProductDetail {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  shortDescription: string | null;
  gtin: string | null;
  manufacturerName: string | null;
  manufacturerGln: string | null;
  // Physical attributes
  netContentValue: number | null;
  netContentUom: string | null;
  grossWeight: number | null;
  grossWeightUom: string | null;
  // Medical device
  isRegulatedDevice: boolean;
  deviceRiskClass: string | null;
  udiDi: string | null;
  // GS1 status
  isGs1Product: boolean;
  gs1VerificationStatus: string;
  // Related data
  primaryImage: ProductMedia | null;
  packaging: ProductPackaging[];
  offers: SupplierOffer[];
  // Catalog status
  inCatalog: boolean;
  itemId: string | null;
}

interface ProductDetailDrawerProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks "Add to My Items" - receives productId only */
  onAddToItems?: (productId: string) => void;
  onSelectSupplier?: (productId: string, offer: SupplierOffer) => void;
}

export function ProductDetailDrawer({
  productId,
  isOpen,
  onClose,
  onAddToItems,
  onSelectSupplier,
}: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  // Fetch product details when drawer opens
  const fetchProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setProduct(null);
    setSelectedOfferId(null);

    try {
      const response = await fetch(`/api/products/${id}/detail`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load product details');
      }

      const data: ProductDetail = await response.json();
      setProduct(data);

      // Select preferred or cheapest offer by default
      const preferredOffer = data.offers.find(o => o.isPreferred);
      const cheapestOffer = data.offers.find(o => o.isCheapest);
      setSelectedOfferId(preferredOffer?.id || cheapestOffer?.id || data.offers[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct(productId);
    }
  }, [isOpen, productId, fetchProduct]);

  const selectedOffer = product?.offers.find(o => o.id === selectedOfferId);

  const handleAddToItems = () => {
    if (product && onAddToItems) {
      onAddToItems(product.id);
    }
  };

  const handleSelectOffer = (offer: SupplierOffer) => {
    setSelectedOfferId(offer.id);
    if (product && onSelectSupplier) {
      onSelectSupplier(product.id, offer);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title=""
      showCloseButton={true}
    >
      {isLoading ? (
        <DrawerSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : product ? (
        <div className="space-y-6">
          {/* Product Header */}
          <div className="flex gap-5">
            {/* Image */}
            <div className="flex-shrink-0 w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              {product.primaryImage ? (
                <img
                  src={product.primaryImage.url}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Package className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h2>
              {product.brand && (
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                  {product.brand}
                </p>
              )}
              {product.shortDescription && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 line-clamp-2">
                  {product.shortDescription}
                </p>
              )}
              
              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {product.inCatalog && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                    In My Items
                  </Badge>
                )}
                {product.isGs1Product && (
                  <Badge variant="info">GS1 Verified</Badge>
                )}
                {product.isRegulatedDevice && (
                  <Badge variant="warning">Medical Device</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Canonical Attributes */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-400" />
              Product Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {product.gtin && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">GTIN</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-200">{product.gtin}</dd>
                </>
              )}
              {product.manufacturerName && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Manufacturer</dt>
                  <dd className="text-slate-900 dark:text-slate-200">{product.manufacturerName}</dd>
                </>
              )}
              {product.netContentValue && product.netContentUom && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Size/Content</dt>
                  <dd className="text-slate-900 dark:text-slate-200">
                    {product.netContentValue} {product.netContentUom}
                  </dd>
                </>
              )}
              {product.grossWeight && product.grossWeightUom && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Weight</dt>
                  <dd className="text-slate-900 dark:text-slate-200">
                    {product.grossWeight} {product.grossWeightUom}
                  </dd>
                </>
              )}
              {product.deviceRiskClass && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Device Class</dt>
                  <dd className="text-slate-900 dark:text-slate-200">{product.deviceRiskClass}</dd>
                </>
              )}
              {product.udiDi && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">UDI-DI</dt>
                  <dd className="font-mono text-xs text-slate-900 dark:text-slate-200">{product.udiDi}</dd>
                </>
              )}
            </dl>
            
            {/* Packaging hierarchy */}
            {product.packaging.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Packaging Levels
                </h4>
                <div className="flex flex-wrap gap-2">
                  {product.packaging.map((pkg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300"
                    >
                      {pkg.level}
                      {pkg.childCount && (
                        <span className="text-slate-400">×{pkg.childCount}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Supplier Offers */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Supplier Offers ({product.offers.length})
            </h3>

            {product.offers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No supplier offers available
              </p>
            ) : (
              <div className="space-y-2">
                {product.offers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => handleSelectOffer(offer)}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedOfferId === offer.id
                        ? 'border-brand bg-brand/5 ring-1 ring-brand'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {offer.practiceSupplier?.customLabel || offer.practiceSupplier?.globalSupplier?.name || offer.supplierName}
                          </span>
                          {/* Badges */}
                          {offer.isPreferred && (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                              <Crown className="h-2.5 w-2.5 mr-0.5 inline" />
                              Preferred
                            </Badge>
                          )}
                          {offer.isCheapest && (
                            <Badge variant="info" className="text-[10px] px-1.5 py-0.5">
                              <DollarSign className="h-2.5 w-2.5 mr-0.5 inline" />
                              Lowest
                            </Badge>
                          )}
                          {offer.hasContract && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                              Contract
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {offer.supplierSku && (
                            <span>SKU: {offer.supplierSku}</span>
                          )}
                          {offer.packSize && (
                            <span>Pack: {offer.packSize}</span>
                          )}
                          {offer.minOrderQty && (
                            <span>MOQ: {offer.minOrderQty}</span>
                          )}
                          {offer.leadTimeDays !== null && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {offer.leadTimeDays} days
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {offer.unitPrice !== null ? (
                          <div className="text-lg font-bold text-brand">
                            {formatCurrency(offer.unitPrice, offer.currency || 'EUR')}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Price on request</span>
                        )}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {selectedOfferId === offer.id && (
                      <div className="absolute top-3 left-3">
                        <div className="w-2 h-2 bg-brand rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Footer */}
          {!product.inCatalog && product.offers.length > 0 && onAddToItems && (
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                {selectedOffer && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Selected: <span className="font-medium text-slate-900 dark:text-white">
                      {selectedOffer.practiceSupplier?.customLabel || selectedOffer.practiceSupplier?.globalSupplier?.name}
                    </span>
                    {selectedOffer.unitPrice !== null && (
                      <span className="ml-2 text-brand font-medium">
                        {formatCurrency(selectedOffer.unitPrice, selectedOffer.currency || 'EUR')}
                      </span>
                    )}
                  </div>
                )}
                <Button variant="primary" onClick={handleAddToItems}>
                  Add to My Items
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </SlideOver>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex gap-5">
        <Skeleton className="w-32 h-32 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Attributes skeleton */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Offers skeleton */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

