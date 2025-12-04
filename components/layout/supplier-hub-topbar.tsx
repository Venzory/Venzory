'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type SupplierHubTopBarProps = {
  userName?: string | null;
  supplierName?: string | null;
  onMenuClick: () => void;
};

export function SupplierHubTopBar({ userName, supplierName, onMenuClick }: SupplierHubTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-teal-200/60 bg-white/80 px-4 backdrop-blur-xl shadow-sm dark:border-teal-800/50 dark:bg-slate-900/80 dark:shadow-md md:px-6">
      {/* Left side: Mobile Menu + Supplier Name */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Supplier Hub Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Supplier Hub
          </span>
          {supplierName && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
              {supplierName}
            </span>
          )}
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

