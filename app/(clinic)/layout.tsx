import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ClinicAppShell } from '@/components/layout/clinic-app-shell';
import { PracticeContextProvider } from '@/components/layout/practice-context-provider';

type ClinicLayoutProps = {
  children: ReactNode;
};

export default async function ClinicLayout({ children }: ClinicLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const memberships = session.user.memberships ?? [];
  const activePracticeId =
    session.user.activePracticeId ?? memberships[0]?.practiceId ?? null;
  const activeMembership =
    memberships.find((m) => m.practiceId === activePracticeId) ?? memberships[0] ?? null;

  // Fetch practice name if possible
  const practiceName: string | null = activeMembership?.practice.name ?? null;

  return (
    <PracticeContextProvider>
      <ClinicAppShell
        userName={session.user.name}
        practiceName={practiceName}
        userRole={activeMembership?.role ?? null}
      >
        {children}
      </ClinicAppShell>
    </PracticeContextProvider>
  );
}

