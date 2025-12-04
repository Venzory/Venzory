'use client';

import { Menu, Database } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type AdminTopBarProps = {
  userName?: string | null;
  onMenuClick: () => void;
};

export function AdminTopBar({ userName, onMenuClick }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-indigo-200 bg-indigo-50/80 px-4 backdrop-blur dark:border-indigo-900/50 dark:bg-indigo-950/50 md:px-6">
      {/* Left side: Mobile Menu + Admin Console Badge */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-200 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Admin Console Badge */}
        <div className="flex items-center gap-2 rounded-lg bg-indigo-100 px-3 py-1.5 dark:bg-indigo-900/50">
          <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">
              Admin Console
            </span>
            <span className="hidden text-xs text-indigo-600/70 dark:text-indigo-400/70 sm:block">
              Data Stewardship
            </span>
          </div>
          <div className="ml-1 h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        </div>
      </div>

      {/* Right Side: Theme Toggle + User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu userName={userName} />
      </div>
    </header>
  );
}

