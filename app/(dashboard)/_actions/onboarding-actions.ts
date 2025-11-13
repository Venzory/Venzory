'use server';

import { revalidatePath } from 'next/cache';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';

/**
 * Mark the practice onboarding as completed
 */
export async function markOnboardingComplete(): Promise<{ success: boolean; error?: string }> {
  try {
    const { session } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    await getSettingsService().updateOnboardingStatus(ctx, 'complete');

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
    const { session } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    await getSettingsService().updateOnboardingStatus(ctx, 'skip');

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
    const { session } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    await getSettingsService().updateOnboardingStatus(ctx, 'reset');

    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('[resetOnboarding]', error);
    return { success: false, error: 'Failed to reset onboarding' };
  }
}

