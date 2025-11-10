import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { prisma } from '@/lib/prisma';

type DashboardLayoutProps = {
  children: ReactNode;
};

// Cache the practice name fetch to avoid multiple DB calls per request
const getPracticeName = cache(async (practiceId: string): Promise<string | null> => {
  try {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: { name: true },
    });
    return practice?.name ?? null;
  } catch (error) {
    console.error('Error fetching practice name:', error);
    return null;
  }
});

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

  // Fetch fresh practice name from database instead of using cached session data
  const practiceName = activePracticeId 
    ? await getPracticeName(activePracticeId)
    : activeMembership?.practice.name ?? null;

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

