'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OnboardingHeader() {
  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="mb-12 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">
          R
        </div>
        <span className="text-xl font-bold text-slate-900 dark:text-white">Venzory</span>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleLogout}
        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>
    </header>
  );
}

