'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { AdminConsoleSidebar } from './admin-console-sidebar';
import { AdminConsoleTopBar } from './admin-console-topbar';

type AdminConsoleShellProps = {
  children: ReactNode;
  userName?: string | null;
};

export function AdminConsoleShell({ children, userName }: AdminConsoleShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-indigo-50/30 dark:bg-indigo-950/10">
      <AdminConsoleSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminConsoleTopBar
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

