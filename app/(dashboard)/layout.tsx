import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
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
  let practiceName: string | null = activeMembership?.practice.name ?? null;

  if (activePracticeId) {
    try {
      const ctx = buildRequestContextFromSession(session);
      const settings = await getSettingsService().getPracticeSettings(ctx);
      practiceName = settings.name;
    } catch (e) {
      // Ignore error, fallback to session data
    }
  }

  return (
    <DashboardLayoutClient
      userName={session.user.name}
      practiceName={practiceName}
      userRole={activeMembership?.role ?? null}
      >
        {children}
    </DashboardLayoutClient>
  );
}
