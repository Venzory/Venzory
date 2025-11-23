interface PracticeLike {
  onboardingCompletedAt?: string | Date | null;
  onboardingSkippedAt?: string | Date | null;
}

/**
 * Returns true when a practice has either completed or explicitly skipped onboarding.
 */
export function isPracticeOnboardingComplete(practice?: PracticeLike | null): boolean {
  if (!practice) {
    return false;
  }
  return Boolean(practice.onboardingCompletedAt || practice.onboardingSkippedAt);
}


