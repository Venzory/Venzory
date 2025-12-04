'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type OwnerConsoleTopBarProps = {
  userName?: string | null;
  onMenuClick: () => void;
};

export function OwnerConsoleTopBar({ userName, onMenuClick }: OwnerConsoleTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-amber-200/60 bg-amber-50/80 px-4 backdrop-blur-xl shadow-sm dark:border-amber-800/50 dark:bg-amber-950/80 dark:shadow-md md:px-6">
      {/* Left side: Mobile Menu + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-200 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Owner Console Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Owner Console
          </span>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800/50 dark:text-amber-200">
            Platform Owner
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

