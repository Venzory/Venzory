'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

type DashboardLayoutClientProps = {
  children: ReactNode;
  userName?: string | null;
  practiceName?: string | null;
};

export function DashboardLayoutClient({
  children,
  userName,
  practiceName,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        practiceName={practiceName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          practiceName={practiceName}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

