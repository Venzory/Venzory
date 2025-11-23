import { describe, it, expect } from 'vitest';

import { isPracticeOnboardingComplete } from '@/lib/onboarding-status';

describe('isPracticeOnboardingComplete', () => {
  it('returns false when onboarding has not finished', () => {
    expect(isPracticeOnboardingComplete({ onboardingCompletedAt: null, onboardingSkippedAt: null })).toBe(false);
  });

  it('returns true when onboarding is completed', () => {
    expect(isPracticeOnboardingComplete({ onboardingCompletedAt: '2025-01-01T00:00:00.000Z', onboardingSkippedAt: null })).toBe(true);
  });

  it('returns true when onboarding is skipped', () => {
    expect(isPracticeOnboardingComplete({ onboardingCompletedAt: null, onboardingSkippedAt: '2025-01-01T00:00:00.000Z' })).toBe(true);
  });
});


