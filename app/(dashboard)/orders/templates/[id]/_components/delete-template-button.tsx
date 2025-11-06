'use client';

import { deleteTemplateAction } from '../../actions';

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }
    await deleteTemplateAction(templateId);
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

