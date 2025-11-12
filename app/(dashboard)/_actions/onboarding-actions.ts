'use server';

import { revalidatePath } from 'next/cache';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Mark the practice onboarding as completed
 */
export async function markOnboardingComplete(): Promise<{ success: boolean; error?: string }> {
  try {
    const { practiceId } = await requireActivePractice();

    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingSkippedAt: null, // Clear skip if they complete it
      },
    });

    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('[markOnboardingComplete]', error);
    return { success: false, error: 'Failed to mark onboarding as complete' };
  }
}

/**
 * Mark the practice onboarding as skipped
 */
export async function skipOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const { practiceId } = await requireActivePractice();

    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingSkippedAt: new Date(),
      },
    });

    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('[skipOnboarding]', error);
    return { success: false, error: 'Failed to skip onboarding' };
  }
}

/**
 * Reset the practice onboarding state (for "Start Tutorial" button)
 */
export async function resetOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const { practiceId } = await requireActivePractice();

    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingCompletedAt: null,
        onboardingSkippedAt: null,
      },
    });

    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('[resetOnboarding]', error);
    return { success: false, error: 'Failed to reset onboarding' };
  }
}

