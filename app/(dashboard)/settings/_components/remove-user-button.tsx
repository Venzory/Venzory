'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { removeUserAction } from '../actions';

export function RemoveUserButton({ userId, userName }: { userId: string; userName: string }) {
  const confirm = useConfirm();

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: 'Remove User',
      message: `Are you sure you want to remove ${userName} from your practice?\n\nThey will lose access to all practice data and won't be able to log in. This won't affect any historical records they created.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeUserAction(userId);
      toast.success('User removed from practice');
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  return (
    <button
      onClick={handleRemove}
      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-xs font-medium"
    >
      Remove
    </button>
  );
}

