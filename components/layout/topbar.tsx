'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '../auth/user-menu';
import { NotificationBell } from '../notifications/notification-bell';
import { PracticeContextSelector, PracticeContextSelectorCompact } from './practice-context-selector';
import { SystemContextBadge, SystemContextBadgeCompact } from './SystemContextBadge';

type TopBarProps = {
  userName?: string | null;
  practiceName?: string | null;
  onMenuClick: () => void;
};

export function TopBar({ userName, practiceName, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/60 px-4 backdrop-blur md:px-6">
      {/* Left side: Mobile Menu + Practice Context Selector + System Context */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-sidebar-text-muted transition hover:bg-sidebar-hover hover:text-sidebar-text md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Practice / Location Context Selector - Full version on desktop */}
        <div className="hidden md:block">
          <PracticeContextSelector />
        </div>
        
        {/* Practice Context - Compact version on mobile */}
        <div className="md:hidden">
          <PracticeContextSelectorCompact />
        </div>

        {/* System Context Badge - shows when in Owner Portal or Admin Console */}
        <div className="hidden md:block">
          <SystemContextBadge />
        </div>
        <div className="md:hidden">
          <SystemContextBadgeCompact />
        </div>
      </div>

      {/* Right Side: Theme Toggle + Notifications + User Menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu userName={userName} practiceName={practiceName} />
      </div>
    </header>
  );
}

