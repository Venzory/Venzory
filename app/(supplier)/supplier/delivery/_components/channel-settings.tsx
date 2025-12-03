'use client';

import { useState } from 'react';
import { Mail, Plus, X, Save } from 'lucide-react';

export function ChannelSettings() {
  const [emailRecipients, setEmailRecipients] = useState(['orders@example.com']);
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddEmail = () => {
    if (newEmail && !emailRecipients.includes(newEmail)) {
      setEmailRecipients([...emailRecipients, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement API call to save settings
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Email Settings</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Manage email recipients for order notifications
      </p>

      <div className="mt-6 space-y-4">
        {/* Recipients List */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Email Recipients
          </label>
          <div className="mt-2 space-y-2">
            {emailRecipients.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-900 dark:text-white">{email}</span>
                </div>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Email */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Add Recipient
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={handleAddEmail}
              disabled={!newEmail}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Notification Format */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Email Format
          </label>
          <select className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="detailed">Detailed - Full order information</option>
            <option value="summary">Summary - Order overview only</option>
            <option value="minimal">Minimal - Just order ID and totals</option>
          </select>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

