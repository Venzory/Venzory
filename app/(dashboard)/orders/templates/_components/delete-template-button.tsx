'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { deleteTemplateAction } from '../actions';

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const confirm = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteTemplateAction(templateId);
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  return (
    <Button
      onClick={handleDelete}
      variant="secondary"
      size="sm"
      title="Delete template"
      className="text-rose-600 hover:text-rose-700 border-rose-300 hover:border-rose-400 dark:text-rose-400 dark:hover:text-rose-300 dark:border-rose-600 dark:hover:border-rose-500"
    >
      Delete
    </Button>
  );
}

