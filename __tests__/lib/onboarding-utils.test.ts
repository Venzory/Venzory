/**
 * Onboarding Utility Tests
 * Tests banner visibility and step completion logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper to determine if onboarding banner should be shown
 */
export function shouldShowOnboardingBanner(
  onboardingStatus: {
    onboardingCompletedAt: Date | null;
    onboardingSkippedAt: Date | null;
  },
  setupProgress: {
    hasLocations: boolean;
    hasSuppliers: boolean;
    hasItems: boolean;
    hasReceivedOrders: boolean;
  },
  canManage: boolean
): boolean {
  // Only show to users who can manage (ADMIN/STAFF)
  if (!canManage) {
    return false;
  }

  // Don't show if explicitly completed
  if (onboardingStatus.onboardingCompletedAt != null) {
    return false;
  }

  // Don't show if explicitly skipped
  if (onboardingStatus.onboardingSkippedAt != null) {
    return false;
  }

  // Don't show if all setup is complete
  const allSetupComplete =
    setupProgress.hasLocations &&
    setupProgress.hasSuppliers &&
    setupProgress.hasItems &&
    setupProgress.hasReceivedOrders;

  if (allSetupComplete) {
    return false;
  }

  // Show banner - user can manage, not completed/skipped, and setup incomplete
  return true;
}

/**
 * Helper to check if all onboarding steps are complete
 */
export function isOnboardingComplete(setupProgress: {
  hasLocations: boolean;
  hasSuppliers: boolean;
  hasItems: boolean;
  hasReceivedOrders: boolean;
}): boolean {
  return (
    setupProgress.hasLocations &&
    setupProgress.hasSuppliers &&
    setupProgress.hasItems &&
    setupProgress.hasReceivedOrders
  );
}

describe('Onboarding Utils', () => {
  describe('shouldShowOnboardingBanner', () => {
    const incompleteSetup = {
      hasLocations: false,
      hasSuppliers: false,
      hasItems: false,
      hasReceivedOrders: false,
    };

    const completeSetup = {
      hasLocations: true,
      hasSuppliers: true,
      hasItems: true,
      hasReceivedOrders: true,
    };

    it('should return false when user cannot manage (VIEWER)', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: null },
        incompleteSetup,
        false // canManage = false
      );

      expect(result).toBe(false);
    });

    it('should return false when onboarding is completed', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: new Date(), onboardingSkippedAt: null },
        incompleteSetup,
        true
      );

      expect(result).toBe(false);
    });

    it('should return false when onboarding is skipped', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: new Date() },
        incompleteSetup,
        true
      );

      expect(result).toBe(false);
    });

    it('should return false when all setup is complete', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: null },
        completeSetup,
        true
      );

      expect(result).toBe(false);
    });

    it('should return true when user can manage, not completed/skipped, and setup incomplete', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: null },
        incompleteSetup,
        true
      );

      expect(result).toBe(true);
    });

    it('should return true when some steps are complete but not all', () => {
      const partialSetup = {
        hasLocations: true,
        hasSuppliers: true,
        hasItems: false,
        hasReceivedOrders: false,
      };

      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: null },
        partialSetup,
        true
      );

      expect(result).toBe(true);
    });

    it('should return false when completed even if setup is incomplete', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: new Date(), onboardingSkippedAt: null },
        incompleteSetup,
        true
      );

      expect(result).toBe(false);
    });

    it('should return false when skipped even if setup is incomplete', () => {
      const result = shouldShowOnboardingBanner(
        { onboardingCompletedAt: null, onboardingSkippedAt: new Date() },
        incompleteSetup,
        true
      );

      expect(result).toBe(false);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return false when no steps are complete', () => {
      const result = isOnboardingComplete({
        hasLocations: false,
        hasSuppliers: false,
        hasItems: false,
        hasReceivedOrders: false,
      });

      expect(result).toBe(false);
    });

    it('should return false when only some steps are complete', () => {
      const result = isOnboardingComplete({
        hasLocations: true,
        hasSuppliers: true,
        hasItems: false,
        hasReceivedOrders: false,
      });

      expect(result).toBe(false);
    });

    it('should return false when all but one step is complete', () => {
      const result = isOnboardingComplete({
        hasLocations: true,
        hasSuppliers: true,
        hasItems: true,
        hasReceivedOrders: false,
      });

      expect(result).toBe(false);
    });

    it('should return true when all steps are complete', () => {
      const result = isOnboardingComplete({
        hasLocations: true,
        hasSuppliers: true,
        hasItems: true,
        hasReceivedOrders: true,
      });

      expect(result).toBe(true);
    });
  });
});

