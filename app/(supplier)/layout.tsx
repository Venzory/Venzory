import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { SupplierHubShell } from '@/components/layout/supplier-hub-shell';

type SupplierLayoutProps = {
  children: ReactNode;
};

export default async function SupplierLayout({ children }: SupplierLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check for supplier portal access
  const supplierContext = await getSupplierContext(session.user.email);

  if (!supplierContext) {
    redirect('/access-denied');
  }

  return (
    <SupplierHubShell
      userName={session.user.name}
      supplierName={supplierContext.supplierName}
      userRole={supplierContext.role}
    >
      {children}
    </SupplierHubShell>
  );
}

