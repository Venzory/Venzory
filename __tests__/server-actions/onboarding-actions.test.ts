/**
 * Onboarding Actions Tests
 * Tests server actions for onboarding complete, skip, and reset
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenError } from '@/src/domain/errors';

// Create mock service functions using vi.hoisted
const { mockUpdateOnboardingStatus } = vi.hoisted(() => ({
  mockUpdateOnboardingStatus: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth
const mockRequireActivePractice = vi.fn();
vi.mock('@/lib/auth', () => ({
  requireActivePractice: () => mockRequireActivePractice(),
}));

// Mock context builder
const mockBuildRequestContext = vi.fn();
vi.mock('@/src/lib/context/context-builder', () => ({
  buildRequestContextFromSession: () => mockBuildRequestContext(),
}));

// Mock settings service
vi.mock('@/src/services', () => ({
  getSettingsService: () => ({
    updateOnboardingStatus: mockUpdateOnboardingStatus,
  }),
}));

// Import after mocks are set up
import {
  markOnboardingComplete,
  skipOnboarding,
  resetOnboarding,
} from '@/app/(dashboard)/_actions/onboarding-actions';

describe('Onboarding Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock context
    mockBuildRequestContext.mockReturnValue({
      userId: 'test-user-id',
      practiceId: 'test-practice-id',
      role: 'STAFF',
    });

    mockRequireActivePractice.mockResolvedValue({
      session: {
        user: {
          id: 'test-user-id',
          memberships: [
            {
              practiceId: 'test-practice-id',
              role: 'STAFF',
            },
          ],
        },
      },
      practiceId: 'test-practice-id',
    });
  });

  describe('markOnboardingComplete', () => {
    it('should call updateOnboardingStatus with complete status', async () => {
      mockUpdateOnboardingStatus.mockResolvedValue(undefined);

      const result = await markOnboardingComplete();

      expect(result).toEqual({ success: true });
      expect(mockUpdateOnboardingStatus).toHaveBeenCalledWith(
        expect.anything(),
        'complete'
      );
    });

    it('should return error when service throws ForbiddenError', async () => {
      mockUpdateOnboardingStatus.mockRejectedValue(
        new ForbiddenError('Insufficient permissions')
      );

      const result = await markOnboardingComplete();

      expect(result).toEqual({
        success: false,
        error: 'Failed to mark onboarding as complete',
      });
    });

    it('should return error when service throws generic error', async () => {
      mockUpdateOnboardingStatus.mockRejectedValue(new Error('Database error'));

      const result = await markOnboardingComplete();

      expect(result).toEqual({
        success: false,
        error: 'Failed to mark onboarding as complete',
      });
    });
  });

  describe('skipOnboarding', () => {
    it('should call updateOnboardingStatus with skip status', async () => {
      mockUpdateOnboardingStatus.mockResolvedValue(undefined);

      const result = await skipOnboarding();

      expect(result).toEqual({ success: true });
      expect(mockUpdateOnboardingStatus).toHaveBeenCalledWith(
        expect.anything(),
        'skip'
      );
    });

    it('should return error when service throws error', async () => {
      mockUpdateOnboardingStatus.mockRejectedValue(new Error('Service error'));

      const result = await skipOnboarding();

      expect(result).toEqual({
        success: false,
        error: 'Failed to skip onboarding',
      });
    });
  });

  describe('resetOnboarding', () => {
    it('should call updateOnboardingStatus with reset status', async () => {
      mockUpdateOnboardingStatus.mockResolvedValue(undefined);

      const result = await resetOnboarding();

      expect(result).toEqual({ success: true });
      expect(mockUpdateOnboardingStatus).toHaveBeenCalledWith(
        expect.anything(),
        'reset'
      );
    });

    it('should return error when service throws error', async () => {
      mockUpdateOnboardingStatus.mockRejectedValue(new Error('Service error'));

      const result = await resetOnboarding();

      expect(result).toEqual({
        success: false,
        error: 'Failed to reset onboarding',
      });
    });
  });
});

