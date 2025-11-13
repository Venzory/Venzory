import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { OnboardingWrapper } from './_components/onboarding-wrapper';
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

  // Fetch onboarding data and practice settings for the active practice
  let shouldShowOnboarding = false;
  let hasSuppliers = false;
  let hasItems = false;
  let hasOrders = false;
  let practiceName: string | null = null;

  if (activePracticeId) {
    try {
      const ctx = buildRequestContextFromSession(session);
      
      const [practiceSettings, onboardingStatus, setupProgress] = await Promise.all([
        getSettingsService().getPracticeSettings(ctx),
        getSettingsService().getPracticeOnboardingStatus(ctx),
        getSettingsService().getSetupProgress(ctx),
      ]);

      practiceName = practiceSettings.name;
      hasSuppliers = setupProgress.hasSuppliers;
      hasItems = setupProgress.hasItems;
      hasOrders = setupProgress.hasOrders;

      // Show onboarding if: not completed AND conditions not met
      const isOnboardingComplete = onboardingStatus.onboardingCompletedAt != null;
      const allSetupComplete = hasSuppliers && hasItems && hasOrders;
      shouldShowOnboarding = !isOnboardingComplete && !allSetupComplete;
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      // Fallback to session data
      practiceName = activeMembership?.practice.name ?? null;
    }
  } else {
    practiceName = activeMembership?.practice.name ?? null;
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

