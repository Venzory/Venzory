import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { SupplierLayoutClient } from '@/components/layout/supplier-layout-client';

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
    <SupplierLayoutClient
      userName={session.user.name}
      supplierName={supplierContext.supplierName}
      userRole={supplierContext.role}
    >
      {children}
    </SupplierLayoutClient>
  );
}

