import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useOnboardingCompletion } from '@/hooks/use-onboarding-completion';
import { isPracticeOnboardingComplete } from '@/lib/onboarding-status';

const completeOnboardingMock = vi.fn();
const skipOnboardingMock = vi.fn();
const routerPushMock = vi.fn();
const toastMock = vi.fn();
const updateSessionMock = vi.fn();

const baseMembership = {
  practiceId: 'practice-1',
  role: 'ADMIN',
  status: 'ACTIVE',
  practice: {
    id: 'practice-1',
    onboardingCompletedAt: null,
    onboardingSkippedAt: null,
  },
};

const cloneMembership = () => JSON.parse(JSON.stringify(baseMembership));

const mockSessionData: any = {
  user: {
    id: 'user-1',
    activePracticeId: 'practice-1',
    memberships: [cloneMembership()],
  },
};

vi.mock('@/app/actions/onboarding', () => ({
  completeOnboarding: (...args: any[]) => completeOnboardingMock(...args),
  skipOnboarding: (...args: any[]) => skipOnboardingMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSessionData,
    update: updateSessionMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const assignSpy = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  mockSessionData.user.memberships = [cloneMembership()];
  updateSessionMock.mockResolvedValue(undefined);
  updateSessionMock.mockClear();
  completeOnboardingMock.mockResolvedValue({ success: true });
  skipOnboardingMock.mockResolvedValue({ success: true });
  completeOnboardingMock.mockClear();
  skipOnboardingMock.mockClear();
  routerPushMock.mockClear();
  toastMock.mockClear();
  assignSpy.mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      assign: assignSpy,
    },
  } as Location);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

describe('useOnboardingCompletion', () => {
  it('completes onboarding, refreshes the session, and hard navigates to the dashboard', async () => {
    const { result } = renderHook(() => useOnboardingCompletion());

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(completeOnboardingMock).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith('/dashboard');
    expect(updateSessionMock).toHaveBeenCalledTimes(1);

    const updatedMembership = updateSessionMock.mock.calls[0][0].user.memberships[0];
    expect(updatedMembership.practice.onboardingCompletedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(updatedMembership.practice.onboardingSkippedAt).toBeNull();
    expect(isPracticeOnboardingComplete(updatedMembership.practice)).toBe(true);
  });

  it('skips onboarding, refreshes the session, and falls back to router navigation when window is unavailable', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useOnboardingCompletion());

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(skipOnboardingMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard');
    const updatedMembership = updateSessionMock.mock.calls[0][0].user.memberships[0];
    expect(updatedMembership.practice.onboardingSkippedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(isPracticeOnboardingComplete(updatedMembership.practice)).toBe(true);
  });
});


