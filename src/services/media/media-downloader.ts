/**
 * Media Downloader (GS1 Foundation - Phase 4)
 * 
 * Handles downloading media files from external URLs and storing them
 * via the configured storage provider.
 */

import logger from '@/lib/logger';
import type { IStorageProvider } from '@/src/lib/storage';
import {
  getStorageProvider,
  getExtensionFromUrl,
  getExtensionFromMimeType,
} from '@/src/lib/storage';

export interface DownloadResult {
  success: boolean;
  filename: string;
  mimeType: string | null;
  fileSize: number;
  storageKey: string;
  url: string;
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
   * Allowed MIME types (default: all images and videos)
   */
  allowedMimeTypes?: string[];
  
  /**
   * Storage folder (default: 'media')
   */
  folder?: string;
}

const DEFAULT_OPTIONS: Required<DownloadOptions> = {
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
  folder: 'media',
};

/**
 * Storage provider interface (re-exported for backwards compatibility)
 */
export { IStorageProvider };

/**
 * Media Downloader
 * 
 * Downloads media from URLs and stores in configured storage provider.
 */
export class MediaDownloader {
  private storageProvider: IStorageProvider;
  
  constructor(storageProvider?: IStorageProvider) {
    this.storageProvider = storageProvider ?? getStorageProvider();
  }
  
  /**
   * Download media from URL
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
    }, 'Starting media download');
    
    // Validate URL
    if (!this.isValidUrl(url)) {
      return {
        success: false,
        filename: '',
        mimeType: null,
        fileSize: 0,
        storageKey: '',
        url: '',
        error: 'Invalid URL',
      };
    }
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
      
      // Fetch the file
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Venzory-GS1-Downloader/1.0',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
      
      if (!opts.allowedMimeTypes.includes(contentType)) {
        return {
          success: false,
          filename: '',
          mimeType: contentType,
          fileSize: 0,
          storageKey: '',
          url: '',
          error: `Invalid content type: ${contentType}. Allowed: ${opts.allowedMimeTypes.join(', ')}`,
        };
      }
      
      // Check content length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > opts.maxFileSize) {
        return {
          success: false,
          filename: '',
          mimeType: contentType,
          fileSize: parseInt(contentLength, 10),
          storageKey: '',
          url: '',
          error: `File too large: ${parseInt(contentLength, 10)} bytes (max: ${opts.maxFileSize} bytes)`,
        };
      }
      
      // Download the file into buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Check actual size
      if (buffer.length > opts.maxFileSize) {
        return {
          success: false,
          filename: '',
          mimeType: contentType,
          fileSize: buffer.length,
          storageKey: '',
          url: '',
          error: `File too large: ${buffer.length} bytes (max: ${opts.maxFileSize} bytes)`,
        };
      }
      
      // Determine file extension
      let ext = getExtensionFromUrl(url);
      if (!ext) {
        ext = getExtensionFromMimeType(contentType) || '.bin';
      }
      
      // Extract original filename from URL if possible
      const originalFilename = this.extractFilenameFromUrl(url) || `download${ext}`;
      
      // Upload to storage
      const uploadResult = await this.storageProvider.upload(buffer, {
        folder: opts.folder,
        contentType,
      });
      
      logger.info({
        module: 'MediaDownloader',
        operation: 'download',
        url,
        storageKey: uploadResult.storageKey,
        fileSize: uploadResult.fileSize,
        contentType: uploadResult.contentType,
      }, 'Media downloaded and stored successfully');
      
      return {
        success: true,
        filename: originalFilename,
        mimeType: contentType,
        fileSize: uploadResult.fileSize,
        storageKey: uploadResult.storageKey,
        url: uploadResult.url,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      
      logger.error({
        module: 'MediaDownloader',
        operation: 'download',
        url,
        error: errorMessage,
        isTimeout,
      }, 'Media download failed');
      
      return {
        success: false,
        filename: '',
        mimeType: null,
        fileSize: 0,
        storageKey: '',
        url: '',
        error: isTimeout ? 'Request timed out' : errorMessage,
      };
    }
  }
  
  /**
   * Download multiple media files with concurrency control
   */
  async downloadBatch(
    urls: string[],
    options: DownloadOptions = {},
    concurrency: number = 3
  ): Promise<Map<string, DownloadResult>> {
    const results = new Map<string, DownloadResult>();
    
    // Process in batches for concurrency control
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.download(url, options))
      );
      
      batch.forEach((url, index) => {
        results.set(url, batchResults[index]);
      });
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
   * Extract filename from URL
   */
  private extractFilenameFromUrl(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1];
      
      // Decode URL-encoded characters
      const decoded = decodeURIComponent(lastSegment);
      
      // Check if it looks like a filename (has extension)
      if (decoded && decoded.includes('.')) {
        return decoded;
      }
      
      return null;
    } catch {
      return null;
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

/**
 * Reset the downloader instance (for testing)
 */
export function resetMediaDownloader(): void {
  mediaDownloaderInstance = null;
}
