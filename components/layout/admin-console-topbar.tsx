'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type AdminConsoleTopBarProps = {
  userName?: string | null;
  onMenuClick: () => void;
};

export function AdminConsoleTopBar({ userName, onMenuClick }: AdminConsoleTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-indigo-200/60 bg-indigo-50/80 px-4 backdrop-blur-xl shadow-sm dark:border-indigo-800/50 dark:bg-indigo-950/80 dark:shadow-md md:px-6">
      {/* Left side: Mobile Menu + Title */}
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
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Admin Console
          </span>
          <span className="rounded-full bg-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-800/50 dark:text-indigo-200">
            Data Steward
          </span>
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

