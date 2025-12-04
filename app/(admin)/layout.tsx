import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { hasAdminConsoleAccess } from '@/lib/owner-guard';
import { AdminConsoleShell } from '@/components/layout/admin-console-shell';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Platform owners and data stewards can access the Admin Console
  const hasAccess = await hasAdminConsoleAccess(session.user.email);
  if (!hasAccess) {
    redirect('/access-denied');
  }

  return (
    <AdminConsoleShell userName={session.user.name}>
      {children}
    </AdminConsoleShell>
  );
}

