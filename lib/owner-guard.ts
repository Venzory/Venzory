import { env } from '@/lib/env';

/**
 * Check if an email belongs to the platform owner.
 * Returns false if PLATFORM_OWNER_EMAIL is not configured.
 */
export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email || !env.PLATFORM_OWNER_EMAIL) {
    return false;
  }
  return email.toLowerCase() === env.PLATFORM_OWNER_EMAIL.toLowerCase();
}

