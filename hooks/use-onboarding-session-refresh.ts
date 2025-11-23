'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

export type OnboardingStatus = 'complete' | 'skip';

/**
 * Returns a stable helper that refreshes the NextAuth session payload
 * after onboarding status changes so middleware immediately sees the update.
 */
export function useOnboardingSessionRefresh() {
  const { data: session, update } = useSession();

  return useCallback(
    async (status: OnboardingStatus) => {
      if (!session?.user?.memberships) {
        await update();
        return;
      }

      const timestamp = new Date().toISOString();
      const activePracticeId =
        session.user.activePracticeId ?? session.user.memberships[0]?.practiceId ?? null;

      const updatedMemberships = session.user.memberships.map((membership) => {
        if (!activePracticeId || membership.practiceId !== activePracticeId) {
          return membership;
        }

        const existingPractice = membership.practice ?? {
          id: membership.practiceId,
        };

        const onboardingCompletedAt =
          status === 'complete' ? timestamp : existingPractice.onboardingCompletedAt ?? null;
        const onboardingSkippedAt =
          status === 'skip' ? timestamp : status === 'complete' ? null : existingPractice.onboardingSkippedAt ?? null;

        return {
          ...membership,
          practice: {
            ...existingPractice,
            onboardingCompletedAt,
            onboardingSkippedAt,
          },
        };
      });

      await update({
        user: {
          ...session.user,
          memberships: updatedMemberships,
        },
      });
    },
    [session, update],
  );
}


