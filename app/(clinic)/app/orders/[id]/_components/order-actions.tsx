'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { sendOrderAction, deleteOrderAction, closeOrderAction } from '../../actions';

interface OrderActionsProps {
  orderId: string;
  canEdit: boolean;
  canReceive: boolean;
  canClose?: boolean;
}

export function OrderActions({ orderId, canEdit, canReceive, canClose = false }: OrderActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseOrder = async () => {
    const confirmed = await confirm({
      title: 'Close Order',
      message: 'This will mark the order as complete. You will not be able to receive any more items against this order. Continue?',
      confirmLabel: 'Close Order',
      variant: 'neutral',
    });

    if (!confirmed) {
      return;
    }

    setIsClosing(true);
    try {
      const result = await closeOrderAction(orderId);
      if (result.success) {
        toast.success('Order closed successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to close order');
      }
    } catch (error: unknown) {
      console.error('Failed to close order:', error);
      const message = error instanceof Error ? error.message : 'Failed to close order';
      toast.error(message);
    } finally {
      setIsClosing(false);
    }
  };

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
      const result = await sendOrderAction(orderId);
      if (result.success) {
        toast.success('Order sent successfully');
        // The action revalidates the path, so router.refresh() will show updated data
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to send order');
      }
    } catch (error: unknown) {
      console.error('Failed to send order:', error);
      const message = error instanceof Error ? error.message : 'Failed to send order';
      toast.error(message);
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
      const result = await deleteOrderAction(orderId);
      if (result.success) {
        toast.success('Order deleted successfully');
        // Navigate to orders list
        router.push('/app/orders');
      } else {
        toast.error(result.error || 'Failed to delete order');
        setIsDeleting(false);
      }
    } catch (error: unknown) {
      console.error('Failed to delete order:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete order';
      toast.error(message);
      setIsDeleting(false);
    }
  };

  if (!canEdit) {
    // If not editable (sent/partial), show close option if allowed
    if (canClose) {
      return (
        <Button
          type="button"
          onClick={handleCloseOrder}
          disabled={isClosing}
          variant="secondary"
          size="md"
          className="flex items-center gap-2"
        >
          {isClosing ? 'Closing...' : 'Close Order'}
        </Button>
      );
    }
    return null;
  }

  return (
    <div className="flex gap-3">
      <Button
        type="button"
        onClick={handleDeleteOrder}
        disabled={isSending || isDeleting}
        variant="secondary"
        size="md"
        className="flex items-center gap-2 text-rose-600 hover:text-rose-700 border-rose-300 hover:border-rose-400 dark:text-rose-400 dark:hover:text-rose-300 dark:border-rose-600 dark:hover:border-rose-500"
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
      </Button>
      <Button
        type="button"
        onClick={handleSendOrder}
        disabled={isSending || isDeleting}
        variant="primary"
        size="md"
        className="flex items-center gap-2"
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
      </Button>
    </div>
  );
}

