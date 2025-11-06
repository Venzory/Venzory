'use server';

import { PracticeRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageUsers, canManagePracticeSettings } from '@/lib/rbac';
import { generateUniquePracticeSlug } from '@/lib/slug';

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
  role: z.nativeEnum(PracticeRole),
});

export async function updatePracticeSettingsAction(
  _prevState: unknown,
  formData: FormData,
) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !canManagePracticeSettings({
      memberships: session.user.memberships,
      practiceId,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

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
    return { error: 'Invalid practice settings' } as const;
  }

  const { name, street, city, postalCode, country, contactEmail, contactPhone, logoUrl } = parsed.data;

  // Generate new slug if name changed
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { name: true, slug: true },
  });

  if (!practice) {
    return { error: 'Practice not found' } as const;
  }

  let slug = practice.slug;
  if (practice.name !== name) {
    slug = await generateUniquePracticeSlug(name);
  }

  await prisma.practice.update({
    where: { id: practiceId },
    data: { 
      name, 
      slug, 
      street, 
      city, 
      postalCode, 
      country, 
      contactEmail, 
      contactPhone, 
      logoUrl 
    },
  });

  revalidatePath('/settings');
  return { success: 'Practice settings updated' } as const;
}

export async function updateUserRoleAction(
  _prevState: unknown,
  formData: FormData,
) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !canManageUsers({
      memberships: session.user.memberships,
      practiceId,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = updateUserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { error: 'Invalid input' } as const;
  }

  const { userId, role } = parsed.data;

  // Find the membership
  const membership = await prisma.practiceUser.findFirst({
    where: {
      practiceId,
      userId,
    },
  });

  if (!membership) {
    return { error: 'User not found in practice' } as const;
  }

  // Prevent user from changing their own role
  if (userId === session.user.id) {
    return { error: 'Cannot change your own role' } as const;
  }

  await prisma.practiceUser.update({
    where: { id: membership.id },
    data: { role },
  });

  revalidatePath('/settings');
  return { success: 'User role updated' } as const;
}

export async function removeUserAction(userId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !canManageUsers({
      memberships: session.user.memberships,
      practiceId,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Prevent user from removing themselves
  if (userId === session.user.id) {
    throw new Error('Cannot remove yourself from the practice');
  }

  // Find the membership
  const membership = await prisma.practiceUser.findFirst({
    where: {
      practiceId,
      userId,
    },
  });

  if (!membership) {
    throw new Error('User not found in practice');
  }

  // Check if this is the last admin
  const adminCount = await prisma.practiceUser.count({
    where: {
      practiceId,
      role: PracticeRole.ADMIN,
    },
  });

  if (adminCount === 1 && membership.role === PracticeRole.ADMIN) {
    throw new Error('Cannot remove the last admin from the practice');
  }

  await prisma.practiceUser.delete({
    where: { id: membership.id },
  });

  revalidatePath('/settings');
}

export async function cancelInviteAction(inviteId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !canManageUsers({
      memberships: session.user.memberships,
      practiceId,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify invite belongs to this practice
  const invite = await prisma.userInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite || invite.practiceId !== practiceId) {
    throw new Error('Invite not found');
  }

  await prisma.userInvite.delete({
    where: { id: inviteId },
  });

  revalidatePath('/settings');
}

// Wrapper functions for inline form usage (no return value expected)
export async function updatePracticeSettingsInlineAction(formData: FormData) {
  await updatePracticeSettingsAction(null, formData);
}

export async function updateUserRoleInlineAction(formData: FormData) {
  await updateUserRoleAction(null, formData);
}

