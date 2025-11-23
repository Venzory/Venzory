import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PracticeRole, MembershipStatus } from '@prisma/client';

import { getSettingsService } from '@/src/services/settings/settings-service';
import type { RequestContext } from '@/src/lib/context/request-context';

describe('Onboarding status transitions', () => {
  const settingsService = getSettingsService();
  let practiceId: string;
  let userId: string;
  let ctx: RequestContext;

  beforeAll(async () => {
    const practice = await prisma.practice.create({
      data: {
        name: 'Onboarding Flow Practice',
        slug: `onboarding-flow-${Date.now()}`,
      },
    });
    practiceId = practice.id;

    const user = await prisma.user.create({
      data: {
        name: 'Onboarding Flow Admin',
        email: `onboarding-flow-admin-${Date.now()}@example.com`,
        passwordHash: 'placeholder-hash',
      },
    });
    userId = user.id;

    await prisma.practiceUser.create({
      data: {
        practiceId,
        userId,
        role: PracticeRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      },
    });

    ctx = {
      userId,
      userEmail: user.email,
      userName: user.name ?? null,
      practiceId,
      role: 'ADMIN',
      memberships: [{ practiceId, role: 'ADMIN', status: 'ACTIVE' }],
      timestamp: new Date(),
      requestId: 'test-onboarding-flow',
    };
  });

  afterAll(async () => {
    await prisma.practiceUser.deleteMany({ where: { practiceId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.practice.deleteMany({ where: { id: practiceId } });
  });

  beforeEach(async () => {
    await settingsService.updateOnboardingStatus(ctx, 'reset');
  });

  it('marks onboarding as complete', async () => {
    await settingsService.updateOnboardingStatus(ctx, 'complete');

    const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
    expect(practice?.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(practice?.onboardingSkippedAt).toBeNull();
  });

  it('marks onboarding as skipped', async () => {
    await settingsService.updateOnboardingStatus(ctx, 'skip');

    const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
    expect(practice?.onboardingSkippedAt).toBeInstanceOf(Date);
    expect(practice?.onboardingCompletedAt).toBeNull();
  });

  it('resets onboarding status', async () => {
    await settingsService.updateOnboardingStatus(ctx, 'complete');
    await settingsService.updateOnboardingStatus(ctx, 'reset');

    const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
    expect(practice?.onboardingCompletedAt).toBeNull();
    expect(practice?.onboardingSkippedAt).toBeNull();
  });
});


