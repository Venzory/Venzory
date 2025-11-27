/**
 * Storage Module (GS1 Foundation - Phase 4)
 * 
 * Provides a pluggable storage abstraction for media and document assets.
 * 
 * Configuration via environment variables:
 * - GS1_STORAGE_PROVIDER: 'local' | 's3' | 'cloudinary' (default: 'local')
 * - GS1_STORAGE_PATH: Base path for local storage (default: 'public/gs1-assets')
 */

import {
  IStorageProvider,
  StorageProviderType,
  StorageUploadOptions,
  StorageUploadResult,
  generateUniqueFilename,
  getExtensionFromUrl,
  getExtensionFromMimeType,
} from './storage-provider';
import { LocalStorageProvider, LocalStorageOptions } from './local-storage-provider';
import {
  resolveAssetUrl,
  isLocallyStored,
  getStorageStatus,
  type AssetWithStorage,
} from './resolve-asset-url';
import logger from '@/lib/logger';

// Re-export types (using 'export type' for interfaces/types due to isolatedModules)
export type {
  IStorageProvider,
  StorageProviderType,
  StorageUploadOptions,
  StorageUploadResult,
};

// Re-export functions
export {
  generateUniqueFilename,
  getExtensionFromUrl,
  getExtensionFromMimeType,
};

export { LocalStorageProvider };
export type { LocalStorageOptions };

// Re-export URL resolution helpers
export {
  resolveAssetUrl,
  isLocallyStored,
  getStorageStatus,
  type AssetWithStorage,
};

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  provider: StorageProviderType;
  localPath?: string;
  // Future: S3 config, Cloudinary config, etc.
}

/**
 * Get storage configuration from environment
 */
export function getStorageConfig(): StorageConfig {
  const provider = (process.env.GS1_STORAGE_PROVIDER || 'local') as StorageProviderType;
  const localPath = process.env.GS1_STORAGE_PATH || 'public/gs1-assets';
  
  return {
    provider,
    localPath,
  };
}

// Singleton instance
let storageProviderInstance: IStorageProvider | null = null;

/**
 * Get the configured storage provider instance
 * 
 * Usage:
 * ```typescript
 * import { getStorageProvider } from '@/src/lib/storage';
 * 
 * const storage = getStorageProvider();
 * const result = await storage.upload(buffer, { folder: 'media', contentType: 'image/jpeg' });
 * console.log('Stored at:', result.url);
 * ```
 */
export function getStorageProvider(): IStorageProvider {
  if (!storageProviderInstance) {
    const config = getStorageConfig();
    
    switch (config.provider) {
      case 'local':
        storageProviderInstance = new LocalStorageProvider({
          basePath: config.localPath,
        });
        break;
        
      case 's3':
        // TODO: Implement S3StorageProvider
        logger.warn({
          module: 'storage',
          operation: 'getStorageProvider',
        }, 'S3 storage not implemented, falling back to local');
        storageProviderInstance = new LocalStorageProvider({
          basePath: config.localPath,
        });
        break;
        
      case 'cloudinary':
        // TODO: Implement CloudinaryStorageProvider
        logger.warn({
          module: 'storage',
          operation: 'getStorageProvider',
        }, 'Cloudinary storage not implemented, falling back to local');
        storageProviderInstance = new LocalStorageProvider({
          basePath: config.localPath,
        });
        break;
        
      default:
        logger.warn({
          module: 'storage',
          operation: 'getStorageProvider',
          provider: config.provider,
        }, 'Unknown storage provider, falling back to local');
        storageProviderInstance = new LocalStorageProvider({
          basePath: config.localPath,
        });
    }
    
    logger.info({
      module: 'storage',
      operation: 'getStorageProvider',
      provider: storageProviderInstance.providerId,
    }, 'Storage provider initialized');
  }
  
  return storageProviderInstance;
}

/**
 * Reset the storage provider instance (for testing)
 */
export function resetStorageProvider(): void {
  storageProviderInstance = null;
}

