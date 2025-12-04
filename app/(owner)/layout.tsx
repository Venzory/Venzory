import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { OwnerConsoleShell } from '@/components/layout/owner-console-shell';

type OwnerLayoutProps = {
  children: ReactNode;
};

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Only platform owners can access the Owner Console
  if (!isPlatformOwner(session.user.email)) {
    redirect('/access-denied');
  }

  return (
    <OwnerConsoleShell userName={session.user.name}>
      {children}
    </OwnerConsoleShell>
  );
}

