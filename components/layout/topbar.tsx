'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';
import { NotificationBell } from '../notifications/notification-bell';

type TopBarProps = {
  userName?: string | null;
  practiceName?: string | null;
  onMenuClick: () => void;
};

export function TopBar({ userName, practiceName, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/60 px-4 backdrop-blur md:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-sidebar-text-muted transition hover:bg-sidebar-hover hover:text-sidebar-text md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer for desktop */}
      <div className="hidden md:block" />

      {/* Right Side: Theme Toggle + Notifications + User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu userName={userName} practiceName={practiceName} />
      </div>
    </header>
  );
}

