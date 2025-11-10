'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { deleteTemplateAction } from '../../actions';

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
    <button
      onClick={handleDelete}
      className="rounded-lg border border-rose-700 bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-900/30"
      title="Delete template"
    >
      Delete Template
    </button>
  );
}

