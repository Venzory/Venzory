'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { getPathOnCurrentOrigin } from '@/lib/current-origin';
import { cn } from '@/lib/utils';

type UserMenuProps = {
  userName?: string | null;
  practiceName?: string | null;
  userEmail?: string | null;
};

export function UserMenu({ userName, practiceName, userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSignOut = () => {
    const callbackUrl = getPathOnCurrentOrigin('/login');
    void signOut({ callbackUrl });
  };

  // Get initials for avatar
  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition',
          'hover:border-slate-400 hover:bg-slate-50',
          'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800',
          'dark:focus:ring-offset-slate-900'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
          {initials}
        </div>
        <span className="hidden sm:inline">{practiceName ?? 'Practice'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 animate-scale-in">
          {/* User Info Header */}
          <div className="border-b border-slate-200 px-3 pb-3 pt-1 dark:border-slate-800">
            <p className="font-medium text-slate-900 dark:text-white">
              {userName || 'User'}
            </p>
            {userEmail && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userEmail}
              </p>
            )}
            {practiceName && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {practiceName}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/app/settings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Settings
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-slate-200 pt-1 dark:border-slate-800">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
