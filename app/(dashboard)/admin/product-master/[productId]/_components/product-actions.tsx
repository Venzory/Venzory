'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { deleteProductAction, triggerGs1LookupAction } from '../../actions';

export function ProductDeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmLabel: 'Delete Product',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProductAction(productId);
      toast.success('Product deleted successfully');
      router.push('/admin/product-master');
    } catch (error) {
      console.error('Failed to delete product:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      toast.error(message);
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-lg border border-rose-600 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-900/20"
    >
      {isDeleting ? 'Deleting...' : 'Delete Product'}
    </button>
  );
}

export function Gs1RefreshButton({ productId }: { productId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await triggerGs1LookupAction(productId);
      
      if (result.success) {
        // Show detailed success message
        const enrichedCount = result.enrichedFields.length;
        toast.success(
          `GS1 enrichment completed! ${enrichedCount} field${enrichedCount !== 1 ? 's' : ''} updated.`
        );
        
        // Show warnings if any
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            toast.info(warning);
          });
        }
      } else {
        // Show warnings/errors for unsuccessful enrichment
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            toast.info(warning);
          });
        }
        if (result.errors.length > 0) {
          result.errors.forEach(err => {
            toast.error(err);
          });
        }
        if (result.warnings.length === 0 && result.errors.length === 0) {
          toast.info('Product could not be enriched from GS1');
        }
      }
      
      router.refresh();
    } catch (error) {
      console.error('Failed to refresh GS1 data:', error);
      toast.error('Failed to trigger GS1 lookup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-lg border border-admin px-4 py-2 text-sm font-semibold text-admin transition hover:bg-admin-light disabled:opacity-50 dark:border-admin dark:text-admin dark:hover:bg-admin/20"
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Enriching...
        </>
      ) : (
        'Enrich from GS1'
      )}
    </button>
  );
}

