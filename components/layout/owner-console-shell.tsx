'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { OwnerConsoleSidebar } from './owner-console-sidebar';
import { OwnerConsoleTopBar } from './owner-console-topbar';

type OwnerConsoleShellProps = {
  children: ReactNode;
  userName?: string | null;
};

export function OwnerConsoleShell({ children, userName }: OwnerConsoleShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-amber-50/30 dark:bg-amber-950/10">
      <OwnerConsoleSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <OwnerConsoleTopBar
          userName={userName}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

