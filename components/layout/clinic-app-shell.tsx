'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { PracticeRole } from '@prisma/client';

import { ClinicSidebar } from './clinic-sidebar';
import { ClinicTopBar } from './clinic-topbar';

type ClinicAppShellProps = {
  children: ReactNode;
  userName?: string | null;
  practiceName?: string | null;
  userRole?: PracticeRole | null;
};

export function ClinicAppShell({
  children,
  userName,
  practiceName,
  userRole,
}: ClinicAppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const normalizedPracticeName =
    practiceName === 'Demo Pracite' ? 'Demo Practice' : practiceName;

  return (
    <div className="flex h-screen bg-surface-secondary">
      <ClinicSidebar
        practiceName={normalizedPracticeName}
        userRole={userRole}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ClinicTopBar
          userName={userName}
          practiceName={normalizedPracticeName}
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

