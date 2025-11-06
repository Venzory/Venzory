'use client';

import { removeTemplateItemAction } from '../../actions';

export function RemoveTemplateItemButton({ templateItemId }: { templateItemId: string }) {
  const handleRemove = async () => {
    if (!confirm('Remove this item from the template?')) {
      return;
    }
    await removeTemplateItemAction(templateItemId);
  };

  return (
    <button
      onClick={handleRemove}
      className="text-sm text-rose-400 transition hover:text-rose-300"
    >
      Remove
    </button>
  );
}

