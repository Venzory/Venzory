'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

type UserMenuProps = {
  userName?: string | null;
  practiceName?: string | null;
};

export function UserMenu({ userName, practiceName }: UserMenuProps) {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
      >
        <span>{practiceName ?? 'Practice'}</span>
        <span className="hidden text-slate-600 dark:text-slate-400 sm:inline">{userName ?? 'Account'}</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white/90 p-2 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/40">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full rounded-lg px-3 py-2 text-left text-slate-900 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

