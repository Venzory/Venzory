'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { OwnerSidebar } from './owner-sidebar';
import { OwnerTopBar } from './owner-topbar';

type OwnerShellProps = {
  children: ReactNode;
  userName?: string | null;
};

export function OwnerShell({ children, userName }: OwnerShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-amber-50/30 dark:bg-amber-950/10">
      <OwnerSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <OwnerTopBar
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

