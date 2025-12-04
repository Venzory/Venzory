'use client';

import { Menu, Shield } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type OwnerTopBarProps = {
  userName?: string | null;
  onMenuClick: () => void;
};

export function OwnerTopBar({ userName, onMenuClick }: OwnerTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-amber-200 bg-amber-50/80 px-4 backdrop-blur dark:border-amber-900/50 dark:bg-amber-950/50 md:px-6">
      {/* Left side: Mobile Menu + Owner Portal Badge */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-200 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Owner Portal Badge */}
        <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 dark:bg-amber-900/50">
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Owner Portal
            </span>
            <span className="hidden text-xs text-amber-600/70 dark:text-amber-400/70 sm:block">
              Platform Management
            </span>
          </div>
          <div className="ml-1 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
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

