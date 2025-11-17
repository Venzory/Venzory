import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { OnboardingWrapper } from './_components/onboarding-wrapper';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';
import { hasRole } from '@/lib/rbac';

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
  let hasLocations = false;
  let hasSuppliers = false;
  let hasItems = false;
  let hasReceivedOrders = false;
  let practiceName: string | null = null;

  // Check if user has actionable role (ADMIN or STAFF)
  const canManageOnboarding = activePracticeId ? hasRole({
    memberships: session.user.memberships,
    practiceId: activePracticeId,
    minimumRole: PracticeRole.STAFF,
  }) : false;

  if (activePracticeId && canManageOnboarding) {
    try {
      const ctx = buildRequestContextFromSession(session);
      
      const [practiceSettings, onboardingStatus, setupProgress] = await Promise.all([
        getSettingsService().getPracticeSettings(ctx),
        getSettingsService().getPracticeOnboardingStatus(ctx),
        getSettingsService().getSetupProgress(ctx),
      ]);

      practiceName = practiceSettings.name;
      hasLocations = setupProgress.hasLocations ?? false;
      hasSuppliers = setupProgress.hasSuppliers ?? false;
      hasItems = setupProgress.hasItems ?? false;
      hasReceivedOrders = setupProgress.hasReceivedOrders ?? false;

      // Show onboarding if: not completed AND not skipped AND conditions not met AND user can manage
      const isOnboardingComplete = onboardingStatus.onboardingCompletedAt != null;
      const isOnboardingSkipped = onboardingStatus.onboardingSkippedAt != null;
      const allSetupComplete = hasLocations && hasSuppliers && hasItems && hasReceivedOrders;
      shouldShowOnboarding = !isOnboardingComplete && !isOnboardingSkipped && !allSetupComplete;
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
        hasLocations={hasLocations}
        hasSuppliers={hasSuppliers}
        hasItems={hasItems}
        hasReceivedOrders={hasReceivedOrders}
      >
        {children}
      </OnboardingWrapper>
    </DashboardLayoutClient>
  );
}

