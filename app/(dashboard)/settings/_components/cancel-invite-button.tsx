'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { cancelInviteAction } from '../actions';

interface CancelInviteButtonProps {
  inviteId: string;
  email: string;
}

export function CancelInviteButton({ inviteId, email }: CancelInviteButtonProps) {
  const confirm = useConfirm();

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Invitation',
      message: `Are you sure you want to cancel the invitation for ${email}? The link sent to them will no longer work.`,
      confirmLabel: 'Cancel Invite',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await cancelInviteAction(inviteId);
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Failed to cancel invite:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel invite';
      toast.error(message);
    }
  };

  return (
    <button
      onClick={handleCancel}
      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-medium"
    >
      Cancel
    </button>
  );
}

