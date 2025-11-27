/**
 * Media Downloader (GS1 Foundation - Phase 1)
 * 
 * Handles downloading media files from external URLs.
 * Phase 1: Stub with interface definition
 * Phase 4: Full implementation with storage providers
 */

import logger from '@/lib/logger';

export interface DownloadResult {
  success: boolean;
  filename: string;
  mimeType: string | null;
  fileSize: number;
  storageKey: string;
  error?: string;
}

export interface DownloadOptions {
  /**
   * Maximum file size in bytes (default: 50MB)
   */
  maxFileSize?: number;
  
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
  
  /**
   * Allowed MIME types (default: all images)
   */
  allowedMimeTypes?: string[];
}

const DEFAULT_OPTIONS: DownloadOptions = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  timeout: 30000, // 30 seconds
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
  ],
};

/**
 * Storage provider interface
 * 
 * TODO (Phase 4): Implement for S3, Cloudinary, etc.
 */
export interface IStorageProvider {
  readonly providerId: string;
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  getUrl(storageKey: string): string;
  delete(storageKey: string): Promise<void>;
}

/**
 * Media Downloader
 * 
 * Downloads media from URLs and stores in configured storage provider.
 */
export class MediaDownloader {
  private storageProvider: IStorageProvider | null = null;
  
  constructor(storageProvider?: IStorageProvider) {
    this.storageProvider = storageProvider ?? null;
  }
  
  /**
   * Download media from URL
   * 
   * TODO (Phase 4): Implement actual download
   */
  async download(
    url: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    logger.info({
      module: 'MediaDownloader',
      operation: 'download',
      url,
    }, 'Media download not implemented (Phase 4)');
    
    // Phase 1: Return stub result
    // Phase 4: Implement actual download
    return {
      success: false,
      filename: '',
      mimeType: null,
      fileSize: 0,
      storageKey: '',
      error: 'Media download not implemented (Phase 4)',
    };
  }
  
  /**
   * Download multiple media files
   * 
   * TODO (Phase 4): Implement parallel download with rate limiting
   */
  async downloadBatch(
    urls: string[],
    options: DownloadOptions = {}
  ): Promise<Map<string, DownloadResult>> {
    const results = new Map<string, DownloadResult>();
    
    for (const url of urls) {
      const result = await this.download(url, options);
      results.set(url, result);
    }
    
    return results;
  }
  
  /**
   * Validate URL before download
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
  
  /**
   * Generate storage key from URL and filename
   */
  private generateStorageKey(url: string, filename?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = this.getExtensionFromUrl(url);
    return `media/${timestamp}-${random}${ext}`;
  }
  
  /**
   * Extract file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
      return match ? `.${match[1].toLowerCase()}` : '';
    } catch {
      return '';
    }
  }
}

// Singleton instance
let mediaDownloaderInstance: MediaDownloader | null = null;

export function getMediaDownloader(): MediaDownloader {
  if (!mediaDownloaderInstance) {
    mediaDownloaderInstance = new MediaDownloader();
  }
  return mediaDownloaderInstance;
}

