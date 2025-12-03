'use client';

import { Menu, Building2 } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';

type SupplierTopBarProps = {
  userName?: string | null;
  supplierName?: string | null;
  onMenuClick: () => void;
};

export function SupplierTopBar({ userName, supplierName, onMenuClick }: SupplierTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/60 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:px-6">
      {/* Left side: Mobile Menu + Supplier Context */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Supplier Portal Badge */}
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-1.5 dark:bg-teal-900/30">
          <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
              Supplier Portal
            </span>
            {supplierName && (
              <span className="hidden text-xs text-teal-600/70 dark:text-teal-400/70 sm:block">
                {supplierName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Theme Toggle + User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu userName={userName} practiceName={supplierName} />
      </div>
    </header>
  );
}

