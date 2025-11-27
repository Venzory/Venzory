/**
 * Media Service (GS1 Foundation - Phase 1)
 * 
 * Handles product media management.
 * Phase 1: Service skeleton with basic CRUD
 * Phase 4: Media download and storage integration
 */

import {
  MediaRepository,
  type ProductMedia,
  type CreateMediaInput,
  type UpdateMediaInput,
  type MediaFilters,
} from '@/src/repositories/products';
import type { MediaType } from '@prisma/client';
import logger from '@/lib/logger';

export interface MediaServiceOptions {
  storageProvider?: 'local' | 's3' | 'cloudinary';
}

export class MediaService {
  constructor(
    private mediaRepo: MediaRepository = new MediaRepository(),
    private options: MediaServiceOptions = { storageProvider: 'local' }
  ) {}
  
  /**
   * Get all media for a product
   */
  async getProductMedia(productId: string): Promise<ProductMedia[]> {
    return this.mediaRepo.findByProductId(productId);
  }
  
  /**
   * Get primary image for a product
   */
  async getPrimaryImage(productId: string): Promise<ProductMedia | null> {
    return this.mediaRepo.findPrimary(productId);
  }
  
  /**
   * Get media by type
   */
  async getMediaByType(productId: string, type: MediaType): Promise<ProductMedia[]> {
    return this.mediaRepo.findByType(productId, type);
  }
  
  /**
   * Add media to product
   */
  async addMedia(input: CreateMediaInput): Promise<ProductMedia> {
    logger.info({
      module: 'MediaService',
      operation: 'addMedia',
      productId: input.productId,
      type: input.type,
      url: input.url,
    }, 'Adding media to product');
    
    return this.mediaRepo.create(input);
  }
  
  /**
   * Update media
   */
  async updateMedia(id: string, input: UpdateMediaInput): Promise<ProductMedia> {
    logger.info({
      module: 'MediaService',
      operation: 'updateMedia',
      mediaId: id,
    }, 'Updating media');
    
    return this.mediaRepo.update(id, input);
  }
  
  /**
   * Delete media
   */
  async deleteMedia(id: string): Promise<void> {
    logger.info({
      module: 'MediaService',
      operation: 'deleteMedia',
      mediaId: id,
    }, 'Deleting media');
    
    // TODO (Phase 4): Also delete from storage provider
    
    return this.mediaRepo.delete(id);
  }
  
  /**
   * Set primary image
   */
  async setPrimaryImage(id: string): Promise<ProductMedia> {
    logger.info({
      module: 'MediaService',
      operation: 'setPrimaryImage',
      mediaId: id,
    }, 'Setting primary image');
    
    return this.mediaRepo.setPrimary(id);
  }
  
  /**
   * Count media for a product
   */
  async countMedia(productId: string): Promise<number> {
    return this.mediaRepo.countByProductId(productId);
  }
  
  /**
   * Check if product has media
   */
  async hasMedia(productId: string): Promise<boolean> {
    const count = await this.countMedia(productId);
    return count > 0;
  }
  
  /**
   * Download and store media from URL
   * 
   * TODO (Phase 4): Implement actual download and storage
   */
  async downloadAndStore(
    productId: string,
    media: {
      type: MediaType;
      url: string;
      filename?: string;
      isPrimary?: boolean;
    }
  ): Promise<ProductMedia> {
    logger.info({
      module: 'MediaService',
      operation: 'downloadAndStore',
      productId,
      url: media.url,
    }, 'Download and store not implemented (Phase 4) - storing URL only');
    
    // Phase 1: Just store the URL reference
    // Phase 4: Download the file and store in storage provider
    return this.addMedia({
      productId,
      type: media.type,
      url: media.url,
      filename: media.filename ?? null,
      isPrimary: media.isPrimary ?? false,
      storageProvider: 'local', // Will be updated in Phase 4
      storageKey: null, // Will be populated when downloaded
    });
  }
  
  /**
   * Batch download and store media
   * 
   * TODO (Phase 4): Implement parallel download with rate limiting
   */
  async batchDownloadAndStore(
    productId: string,
    mediaList: Array<{
      type: MediaType;
      url: string;
      filename?: string;
      isPrimary?: boolean;
    }>
  ): Promise<{ success: number; failed: number; media: ProductMedia[] }> {
    const results: ProductMedia[] = [];
    let failed = 0;
    
    for (const item of mediaList) {
      try {
        const media = await this.downloadAndStore(productId, item);
        results.push(media);
      } catch (error) {
        failed++;
        logger.error({
          module: 'MediaService',
          operation: 'batchDownloadAndStore',
          productId,
          url: item.url,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to download media');
      }
    }
    
    return {
      success: results.length,
      failed,
      media: results,
    };
  }
}

// Singleton instance
let mediaServiceInstance: MediaService | null = null;

export function getMediaService(): MediaService {
  if (!mediaServiceInstance) {
    mediaServiceInstance = new MediaService();
  }
  return mediaServiceInstance;
}

