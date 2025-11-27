/**
 * Asset URL Resolution (GS1 Foundation - Phase 4)
 * 
 * Helper function to resolve the best URL for displaying product assets.
 * Prefers locally stored assets over external URLs.
 */

export interface AssetWithStorage {
  url: string;
  storageKey?: string | null;
  storageProvider?: string | null;
}

/**
 * Resolve the display URL for an asset
 * 
 * Returns the local storage URL if the asset has been downloaded,
 * otherwise falls back to the original external URL.
 * 
 * @param asset - Asset with url, storageKey, and storageProvider fields
 * @returns The resolved URL to display/use
 * 
 * @example
 * ```tsx
 * const displayUrl = resolveAssetUrl(media);
 * return <img src={displayUrl} alt="Product" />;
 * ```
 */
export function resolveAssetUrl(asset: AssetWithStorage): string {
  // If we have a local storage key, use the local URL
  if (asset.storageKey && asset.storageProvider === 'local') {
    return `/gs1-assets/${asset.storageKey}`;
  }
  
  // Fallback to original URL
  return asset.url;
}

/**
 * Check if an asset is stored locally
 * 
 * @param asset - Asset with storageKey and storageProvider fields
 * @returns true if asset is stored locally
 */
export function isLocallyStored(asset: AssetWithStorage): boolean {
  return !!(asset.storageKey && asset.storageProvider === 'local');
}

/**
 * Get storage status label for display
 * 
 * @param asset - Asset with storageKey and storageProvider fields
 * @returns Human-readable storage status
 */
export function getStorageStatus(asset: AssetWithStorage): 'local' | 'external' | 'pending' {
  if (asset.storageKey && asset.storageProvider) {
    return 'local';
  }
  
  // Has URL but no storage key - either pending download or external only
  if (asset.url) {
    // Could check for pending download job here, but for simplicity:
    return 'external';
  }
  
  return 'pending';
}

