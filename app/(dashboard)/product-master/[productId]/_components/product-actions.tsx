'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { deleteProductAction, triggerGs1LookupAction } from '../../actions';

interface ProductActionsProps {
  productId: string;
  hasGtin: boolean;
}

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
      router.push('/product-master');
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
      await triggerGs1LookupAction(productId);
      toast.success('GS1 data refresh triggered');
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
      className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 disabled:opacity-50 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-900/20"
    >
      {isLoading ? 'Refreshing...' : 'Refresh GS1 Data'}
    </button>
  );
}

