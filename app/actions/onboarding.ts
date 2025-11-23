'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getSettingsService } from '@/src/services/settings/settings-service';
import { LocationRepository } from '@/src/repositories/locations';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import logger from '@/lib/logger';
import { isDomainError } from '@/src/domain/errors';
import {
  practiceDetailsSchema,
  type PracticeDetailsInput,
} from '@/lib/onboarding-validation';

// Schemas
const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().optional(),
});

const inviteTeamSchema = z.object({
  emails: z.array(z.string().email('Invalid email address')),
});

// Services & Repositories
const locationRepository = new LocationRepository();

/**
 * Helper to get authenticated context
 */
async function getAuthenticatedContext() {
  const session = await auth();
  if (!session?.user?.activePracticeId) {
    throw new Error('Unauthorized');
  }
  return buildRequestContextFromSession(session);
}

/**
 * Update practice details
 */
export async function updatePracticeDetails(data: PracticeDetailsInput) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await getAuthenticatedContext();
    const parsed = practiceDetailsSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: 'Invalid data provided' };
    }

    const { houseNumber, street, ...rest } = parsed.data;
    const combinedStreet = `${street} ${houseNumber}`.trim();

    await getSettingsService().updatePracticeSettings(ctx, {
      ...rest,
      street: combinedStreet,
    });
    
    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Failed to update practice details');
    if (isDomainError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Create first location
 */
export async function createFirstLocation(data: z.infer<typeof createLocationSchema>) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await getAuthenticatedContext();
    const parsed = createLocationSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: 'Invalid data provided' };
    }

    await locationRepository.createLocation(ctx.practiceId, {
      name: parsed.data.name,
      description: parsed.data.description,
    });

    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Failed to create location');
    if (isDomainError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Invite team members
 */
export async function inviteTeamMembers(data: z.infer<typeof inviteTeamSchema>) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await getAuthenticatedContext();
    const parsed = inviteTeamSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: 'Invalid email addresses' };
    }

    const service = getSettingsService();
    
    // Process invites in parallel, but capture individual failures?
    // For simplicity in onboarding, we'll try all and return generic error if any fail, 
    // or maybe just success.
    // To stay robust, let's loop.
    
    const results = await Promise.allSettled(
      parsed.data.emails.map(email => 
        service.createInvite(ctx, {
          email,
          role: 'STAFF', // Default role for team invites
          inviterName: ctx.userName ?? null,
        })
      )
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      // We could return specific errors, but for now just warn
      logger.warn({ failures }, 'Some invites failed');
    }

    return { success: true, failedCount: failures.length };
  } catch (error) {
    logger.error({ error }, 'Failed to invite team members');
    if (isDomainError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding() {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await getAuthenticatedContext();
    await getSettingsService().updateOnboardingStatus(ctx, 'complete');
    
    // Revalidate everything to ensure middleware and UI update
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    logger.info(
      {
        userId: ctx.userId,
        practiceId: ctx.practiceId,
        action: 'complete',
      },
      'Onboarding status updated',
    );
    
    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Failed to complete onboarding');
    return { success: false, error: 'Failed to complete onboarding' };
  }
}

/**
 * Skip onboarding
 */
export async function skipOnboarding() {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await getAuthenticatedContext();
    await getSettingsService().updateOnboardingStatus(ctx, 'skip');
    
    // Must revalidate paths that use this status
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    logger.info(
      {
        userId: ctx.userId,
        practiceId: ctx.practiceId,
        action: 'skip',
      },
      'Onboarding status updated',
    );
    
    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Failed to skip onboarding');
    return { success: false, error: 'Failed to skip onboarding' };
  }
}
