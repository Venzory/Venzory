import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import type { PlatformRole } from '@prisma/client';

function normalizeEmail(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}

// ============================================
// ENV-BASED CHECKS (Edge Runtime Compatible)
// ============================================

/**
 * Check if an email belongs to the platform owner via env variable.
 * This is a sync check compatible with edge runtime (middleware).
 * Prefer isPlatformOwnerAsync() in server components/actions.
 */
export function isPlatformOwnerEnv(email: string | null | undefined): boolean {
  const configuredOwnerEmail =
    env.PLATFORM_OWNER_EMAIL || env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL;

  const normalizedUserEmail = normalizeEmail(email);
  const normalizedOwnerEmail = normalizeEmail(configuredOwnerEmail);

  const isOwner =
    Boolean(normalizedUserEmail) &&
    Boolean(normalizedOwnerEmail) &&
    normalizedUserEmail === normalizedOwnerEmail;

  return isOwner;
}

/**
 * Check if an email is a data steward via env variable.
 * PLATFORM_DATA_STEWARD_EMAILS is a comma-separated list of emails.
 * This is a sync check compatible with edge runtime (middleware).
 */
export function isDataStewardEnv(email: string | null | undefined): boolean {
  const stewardEmailsRaw = env.PLATFORM_DATA_STEWARD_EMAILS;
  if (!stewardEmailsRaw) return false;

  const normalizedUserEmail = normalizeEmail(email);
  if (!normalizedUserEmail) return false;

  const stewardEmails = stewardEmailsRaw
    .split(',')
    .map((e) => normalizeEmail(e.trim()))
    .filter(Boolean);

  return stewardEmails.includes(normalizedUserEmail);
}

/**
 * Check if an email has Admin Console access via env variables.
 * Both platform owner and data stewards have Admin Console access.
 * This is a sync check compatible with edge runtime (middleware).
 */
export function hasAdminConsoleAccessEnv(email: string | null | undefined): boolean {
  return isPlatformOwnerEnv(email) || isDataStewardEnv(email);
}

/**
 * Legacy alias - checks env variable for platform owner only.
 * For Admin Console access, use hasAdminConsoleAccessEnv() which includes data stewards.
 */
export function isPlatformOwner(email: string | null | undefined): boolean {
  return isPlatformOwnerEnv(email);
}

// ============================================
// DATABASE-BACKED CHECKS (Preferred)
// ============================================

export interface PlatformAdminInfo {
  id: string;
  userId: string;
  role: PlatformRole;
  userEmail: string;
  userName: string | null;
}

/**
 * Get platform admin record for a user by email.
 * Returns null if user is not a platform admin.
 */
export async function getPlatformAdmin(
  email: string | null | undefined
): Promise<PlatformAdminInfo | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  try {
    const admin = await prisma.platformAdmin.findFirst({
      where: {
        user: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!admin) return null;

    return {
      id: admin.id,
      userId: admin.userId,
      role: admin.role,
      userEmail: admin.user.email,
      userName: admin.user.name,
    };
  } catch (error) {
    // If table doesn't exist yet (before migration), fall back to null
    console.warn('[owner-guard] getPlatformAdmin query failed:', error);
    return null;
  }
}

/**
 * Get platform admin record for a user by user ID.
 */
export async function getPlatformAdminByUserId(
  userId: string | null | undefined
): Promise<PlatformAdminInfo | null> {
  if (!userId) return null;

  try {
    const admin = await prisma.platformAdmin.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!admin) return null;

    return {
      id: admin.id,
      userId: admin.userId,
      role: admin.role,
      userEmail: admin.user.email,
      userName: admin.user.name,
    };
  } catch (error) {
    console.warn('[owner-guard] getPlatformAdminByUserId query failed:', error);
    return null;
  }
}

/**
 * Check if a user is a platform owner (highest privilege).
 * Checks database first, falls back to env variable.
 */
export async function isPlatformOwnerAsync(
  email: string | null | undefined
): Promise<boolean> {
  // First check database
  const admin = await getPlatformAdmin(email);
  if (admin?.role === 'PLATFORM_OWNER') {
    return true;
  }

  // Fall back to env variable check for backward compatibility
  return isPlatformOwnerEnv(email);
}

/**
 * Check if a user is a data steward.
 * Data stewards have Admin Console access but NOT Owner Portal access.
 */
export async function isDataSteward(
  email: string | null | undefined
): Promise<boolean> {
  const admin = await getPlatformAdmin(email);
  return admin?.role === 'DATA_STEWARD';
}

/**
 * Check if a user has Admin Console access.
 * Both PLATFORM_OWNER and DATA_STEWARD have Admin Console access.
 */
export async function hasAdminConsoleAccess(
  email: string | null | undefined
): Promise<boolean> {
  // Check database first
  const admin = await getPlatformAdmin(email);
  if (admin) {
    return true; // Both PLATFORM_OWNER and DATA_STEWARD have admin access
  }

  // Fall back to env variable check
  return isPlatformOwnerEnv(email);
}

/**
 * Check if a user has Owner Portal access.
 * Only PLATFORM_OWNER has Owner Portal access.
 */
export async function hasOwnerPortalAccess(
  email: string | null | undefined
): Promise<boolean> {
  return isPlatformOwnerAsync(email);
}

/**
 * Get the platform role for a user.
 * Returns null if user has no platform access.
 */
export async function getPlatformRole(
  email: string | null | undefined
): Promise<PlatformRole | null> {
  const admin = await getPlatformAdmin(email);
  if (admin) {
    return admin.role;
  }

  // Check env variable as fallback for platform owner
  if (isPlatformOwnerEnv(email)) {
    return 'PLATFORM_OWNER';
  }

  return null;
}
