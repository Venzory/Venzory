'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { sendOrderAction, deleteOrderAction } from '../../actions';

interface OrderActionsProps {
  orderId: string;
  canEdit: boolean;
  canReceive: boolean;
}

export function OrderActions({ orderId, canEdit, canReceive }: OrderActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSendOrder = async () => {
    const confirmed = await confirm({
      title: 'Send Order to Supplier',
      message: 'This will mark the order as sent. You will not be able to edit it afterwards. Continue?',
      confirmLabel: 'Send Order',
      variant: 'neutral',
    });

    if (!confirmed) {
      return;
    }

    setIsSending(true);
    try {
      await sendOrderAction(orderId);
      toast.success('Order sent successfully');
      // The action revalidates the path, so router.refresh() will show updated data
      router.refresh();
    } catch (error: any) {
      console.error('Failed to send order:', error);
      toast.error(error?.message || 'Failed to send order');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteOrder = async () => {
    const confirmed = await confirm({
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      confirmLabel: 'Delete Order',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrderAction(orderId);
      toast.success('Order deleted successfully');
      // Redirect to orders list
      router.push('/orders');
    } catch (error: any) {
      console.error('Failed to delete order:', error);
      toast.error(error?.message || 'Failed to delete order');
      setIsDeleting(false);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleSendOrder}
        disabled={isSending || isDeleting}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
      >
        {isSending ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : (
          'Send to Supplier'
        )}
      </button>
      <button
        type="button"
        onClick={handleDeleteOrder}
        disabled={isSending || isDeleting}
        className="rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-900/20 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
      >
        {isDeleting ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Deleting...
          </>
        ) : (
          'Delete Order'
        )}
      </button>
    </div>
  );
}

