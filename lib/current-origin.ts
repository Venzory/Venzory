/**
 * Returns a path scoped to the user's current origin (preview or production).
 * Falls back to the raw path when window is unavailable (e.g. during SSR).
 */
export function getPathOnCurrentOrigin(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('Path must start with "/" to be normalized.');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return path;
}


