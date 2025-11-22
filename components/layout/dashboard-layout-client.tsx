'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { PracticeRole } from '@prisma/client';

import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

type DashboardLayoutClientProps = {
  children: ReactNode;
  userName?: string | null;
  practiceName?: string | null;
  userRole?: PracticeRole | null;
  isOwner?: boolean;
};

export function DashboardLayoutClient({
  children,
  userName,
  practiceName,
  userRole,
  isOwner = false,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const normalizedPracticeName =
    practiceName === 'Demo Pracite' ? 'Demo Practice' : practiceName;

  return (
    <div className="flex h-screen bg-surface-secondary">
      <Sidebar
        practiceName={normalizedPracticeName}
        userRole={userRole}
        isOwner={isOwner}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          practiceName={normalizedPracticeName}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

