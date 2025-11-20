'use client';

import { useState, useTransition } from 'react';
import { inviteTeamMembers } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface StepInviteTeamProps {
  onNext: () => void;
  onBack: () => void;
  isCompleting: boolean;
  onSkip: () => void;
}

export function StepInviteTeam({ onNext, onBack, isCompleting, onSkip }: StepInviteTeamProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [emails, setEmails] = useState<string[]>(['']);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty emails
    const validEmails = emails.filter(e => e.trim() !== '');
    
    if (validEmails.length === 0) {
      // If no emails, treat as skip/finish
      onNext();
      return;
    }
    
    startTransition(async () => {
      const result = await inviteTeamMembers({ emails: validEmails });
      
      if (result.success) {
        onNext();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send invites',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Invite Team</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Invite colleagues to help manage inventory. You can always add more later.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Email Addresses
        </label>
        
        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {emails.length > 1 && (
              <button
                type="button"
                onClick={() => removeEmailField(index)}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={addEmailField}
          className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Add another
        </button>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending || isCompleting}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <div className="flex gap-3">
            <button
                type="button"
                onClick={onNext}
                disabled={isPending || isCompleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400"
            >
                Skip this step
            </button>
            <button
            type="submit"
            disabled={isPending || isCompleting}
            className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
            {isPending || isCompleting ? 'Finishing up...' : 'Finish Setup'}
            </button>
        </div>
      </div>
    </form>
  );
}

