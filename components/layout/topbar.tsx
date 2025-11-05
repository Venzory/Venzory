'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type TopBarProps = {
  userName?: string | null;
  practiceName?: string | null;
  onMenuClick: () => void;
};

export function TopBar({ userName, practiceName, onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/60 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* Right Side: Theme Toggle + User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu userName={userName} practiceName={practiceName} />
      </div>
    </header>
  );
}

