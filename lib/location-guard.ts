/**
 * Location Guard
 * Utilities for location-level access control
 */

import type { RequestContext } from '@/src/lib/context/request-context';
import { ForbiddenError } from '@/src/domain/errors';

/**
 * Require access to a specific location
 * Throws ForbiddenError if user doesn't have access
 */
export function requireLocationAccess(
  ctx: RequestContext,
  locationId: string
): void {
  // OWNER and ADMIN have access to all locations
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return;
  }

  if (!ctx.allowedLocationIds.includes(locationId)) {
    throw new ForbiddenError('No access to this location');
  }
}

/**
 * Get the effective location scope for queries
 * Returns null if user has access to all locations (OWNER/ADMIN)
 * Returns array of allowed location IDs for MANAGER/STAFF
 */
export function getEffectiveLocationScope(ctx: RequestContext): string[] | null {
  // OWNER and ADMIN see all locations
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return null;
  }
  return ctx.allowedLocationIds;
}

/**
 * Build a location filter for Prisma queries
 * Returns undefined if user has access to all locations
 * Returns { in: [...] } filter for specific locations
 */
export function buildLocationFilter(
  ctx: RequestContext
): { in: string[] } | undefined {
  const scope = getEffectiveLocationScope(ctx);
  if (scope === null) {
    return undefined;
  }
  return { in: scope };
}

/**
 * Validate that a location belongs to the user's allowed locations
 * Returns the locationId if valid, throws ForbiddenError otherwise
 */
export function validateLocationId(
  ctx: RequestContext,
  locationId: string | null | undefined
): string | null {
  if (!locationId) {
    return null;
  }

  // OWNER and ADMIN have access to all locations
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return locationId;
  }

  if (!ctx.allowedLocationIds.includes(locationId)) {
    throw new ForbiddenError('No access to this location');
  }

  return locationId;
}

/**
 * Check if a user can access a specific location (without throwing)
 */
export function canAccessLocation(
  ctx: RequestContext,
  locationId: string
): boolean {
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return true;
  }
  return ctx.allowedLocationIds.includes(locationId);
}

/**
 * Filter an array of location IDs to only those the user can access
 */
export function filterAllowedLocations(
  ctx: RequestContext,
  locationIds: string[]
): string[] {
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return locationIds;
  }
  return locationIds.filter((id) => ctx.allowedLocationIds.includes(id));
}

