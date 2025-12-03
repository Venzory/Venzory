'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { SupplierRole } from '@prisma/client';

import { SupplierSidebar } from './supplier-sidebar';
import { SupplierTopBar } from './supplier-topbar';

type SupplierLayoutClientProps = {
  children: ReactNode;
  userName?: string | null;
  supplierName?: string | null;
  userRole?: SupplierRole | null;
};

export function SupplierLayoutClient({
  children,
  userName,
  supplierName,
  userRole,
}: SupplierLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <SupplierSidebar
        supplierName={supplierName}
        userRole={userRole}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SupplierTopBar
          userName={userName}
          supplierName={supplierName}
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

