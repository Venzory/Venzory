'use client';

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { getPathOnCurrentOrigin } from '@/lib/current-origin';

interface SignOutButtonProps {
  label?: string;
  className?: string;
}

export function SignOutButton({ label = 'Sign out', className }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      const callbackUrl = getPathOnCurrentOrigin('/login');
      void signOut({ callbackUrl });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={className ?? 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60'}
    >
      {isPending ? 'Signing out…' : label}
    </button>
  );
}


