'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { updateTemplateAction } from '../../actions';

interface EditTemplateFormProps {
  templateId: string;
  currentName: string;
  currentDescription: string | null;
}

export function EditTemplateForm({
  templateId,
  currentName,
  currentDescription,
}: EditTemplateFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.set('templateId', templateId);
    formData.set('name', name);
    formData.set('description', description);

    try {
      await updateTemplateAction(formData);
      toast.success('Template updated');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Edit Template Details
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900/60">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Template Details</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-slate-600 dark:text-slate-400">
            Template Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm text-slate-600 dark:text-slate-400">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => {
            setName(currentName);
            setDescription(currentDescription || '');
            setIsEditing(false);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

