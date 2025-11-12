import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '@/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { OnboardingWrapper } from './_components/onboarding-wrapper';
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

  // Fetch onboarding data for the active practice
  let shouldShowOnboarding = false;
  let hasSuppliers = false;
  let hasItems = false;
  let hasOrders = false;

  if (activePracticeId) {
    try {
      const [practice, supplierCount, itemCount, orderCount] = await Promise.all([
        prisma.practice.findUnique({
          where: { id: activePracticeId },
          select: {
            onboardingCompletedAt: true,
            onboardingSkippedAt: true,
          },
        }),
        prisma.practiceSupplier.count({
          where: { practiceId: activePracticeId },
        }),
        prisma.item.count({
          where: { practiceId: activePracticeId },
        }),
        prisma.order.count({
          where: { practiceId: activePracticeId },
        }),
      ]);

      hasSuppliers = supplierCount > 0;
      hasItems = itemCount > 0;
      hasOrders = orderCount > 0;

      // Show onboarding if: not completed AND conditions not met
      const isOnboardingComplete = practice?.onboardingCompletedAt != null;
      const allSetupComplete = hasSuppliers && hasItems && hasOrders;
      shouldShowOnboarding = !isOnboardingComplete && !allSetupComplete;
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    }
  }

  return (
    <DashboardLayoutClient
      userName={session.user.name}
      practiceName={practiceName}
      userRole={activeMembership?.role ?? null}
    >
      <OnboardingWrapper
        shouldShowOnboarding={shouldShowOnboarding}
        hasSuppliers={hasSuppliers}
        hasItems={hasItems}
        hasOrders={hasOrders}
      >
        {children}
      </OnboardingWrapper>
    </DashboardLayoutClient>
  );
}

