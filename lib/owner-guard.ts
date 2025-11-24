import { env } from '@/lib/env';

function normalizeEmail(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}

/**
 * Check if an email belongs to the platform owner.
 * Returns false if PLATFORM_OWNER_EMAIL is not configured.
 */
export function isPlatformOwner(email: string | null | undefined): boolean {
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

