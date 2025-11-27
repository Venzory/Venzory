/**
 * Settings Actions (Refactored)
 * Thin wrappers around SettingsService
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services/settings';
import { isDomainError } from '@/src/domain/errors';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { PracticeRole } from '@prisma/client';

const settingsService = getSettingsService();

// Validation schemas
const updatePracticeSettingsSchema = z.object({
  name: z.string().min(1, 'Practice name is required').max(100),
  street: z.string().max(200).optional().transform((value) => value?.trim() || null),
  city: z.string().max(100).optional().transform((value) => value?.trim() || null),
  postalCode: z.string().max(20).optional().transform((value) => value?.trim() || null),
  country: z.string().max(100).optional().transform((value) => value?.trim() || null),
  contactEmail: z
    .string()
    .email('Invalid email format')
    .max(255)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value?.trim() ? value.trim() : null)),
  contactPhone: z.string().max(50).optional().transform((value) => value?.trim() || null),
  logoUrl: z
    .string()
    .url('Invalid URL format')
    .max(500)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

const updateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['STAFF', 'MANAGER', 'ADMIN']),  // OWNER cannot be assigned via this form
});

const inviteUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  role: z.nativeEnum(PracticeRole),
  name: z.string().optional().transform((value) => value?.trim() || null),
});

export async function inviteUserAction(
  _prevState: unknown,
  formData: FormData,
) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = inviteUserSchema.safeParse({
      email: formData.get('email'),
      role: formData.get('role'),
      name: formData.get('name'),
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
    }

    const { email, role, name } = parsed.data;

    // Create invite via service
    await settingsService.createInvite(ctx, {
      email,
      role,
      inviterName: name,
    });

    revalidatePath('/settings');
    return { success: `Invitation sent to ${email}` };
  } catch (error) {
    console.error('[Settings Actions] Error inviting user:', error);
    
    if (isDomainError(error)) {
      return { error: error.message };
    }
    
    return { error: 'Failed to send invitation' };
  }
}

export async function updatePracticeSettingsAction(
  _prevState: unknown,
  formData: FormData,
) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = updatePracticeSettingsSchema.safeParse({
      name: formData.get('name'),
      street: formData.get('street'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      contactEmail: formData.get('contactEmail'),
      contactPhone: formData.get('contactPhone'),
      logoUrl: formData.get('logoUrl'),
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors } as const;
    }

    const { name, street, city, postalCode, country, contactEmail, contactPhone, logoUrl } = parsed.data;

    // Update practice settings via service
    await settingsService.updatePracticeSettings(ctx, {
      name,
      street,
      city,
      postalCode,
      country,
      contactEmail,
      contactPhone,
      logoUrl,
    });

    // Revalidate settings page and layout to update sidebar
    revalidatePath('/settings');
    revalidatePath('/(dashboard)', 'layout');
    revalidatePath('/dashboard');
    
    return { success: 'Practice settings updated' } as const;
  } catch (error) {
    console.error('[Settings Actions] Error updating practice settings:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to update practice settings' } as const;
  }
}

export async function updateUserRoleAction(
  _prevState: unknown,
  formData: FormData,
) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = updateUserRoleSchema.safeParse({
      userId: formData.get('userId'),
      role: formData.get('role'),
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors } as const;
    }

    const { userId, role } = parsed.data;

    // Update user role via service
    await settingsService.updateUserRole(ctx, userId, role);

    revalidatePath('/settings');
    return { success: 'User role updated' } as const;
  } catch (error) {
    console.error('[Settings Actions] Error updating user role:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to update user role' } as const;
  }
}

export async function removeUserAction(userId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Remove user via service
    await settingsService.removeUser(ctx, userId);

    revalidatePath('/settings');
  } catch (error) {
    console.error('[Settings Actions] Error removing user:', error);
    
    // Preserve domain error messages (e.g. last admin, permission errors)
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    // Preserve generic error messages
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to remove user');
  }
}

export async function cancelInviteAction(inviteId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Cancel invite via service
    await settingsService.cancelInvite(ctx, inviteId);

    revalidatePath('/settings');
  } catch (error) {
    console.error('[Settings Actions] Error cancelling invite:', error);
    
    // Preserve domain error messages (e.g. permission errors)
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    // Preserve generic error messages
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to cancel invite');
  }
}

// Wrapper functions for inline form usage (no return value expected)
// These simply delegate to the primary actions without redundant checks
export async function updatePracticeSettingsInlineAction(formData: FormData) {
  await updatePracticeSettingsAction(null, formData);
}

export async function updateUserRoleInlineAction(formData: FormData) {
  await updateUserRoleAction(null, formData);
}

