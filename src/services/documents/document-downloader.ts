/**
 * Document Downloader (GS1 Foundation - Phase 4)
 * 
 * Handles downloading document files from external URLs and storing them
 * via the configured storage provider.
 */

import logger from '@/lib/logger';
import {
  IStorageProvider,
  getStorageProvider,
  getExtensionFromUrl,
  getExtensionFromMimeType,
} from '@/src/lib/storage';

export interface DocumentDownloadResult {
  success: boolean;
  filename: string;
  mimeType: string | null;
  fileSize: number;
  storageKey: string;
  url: string;
  error?: string;
}

export interface DocumentDownloadOptions {
  /**
   * Maximum file size in bytes (default: 100MB)
   */
  maxFileSize?: number;
  
  /**
   * Request timeout in milliseconds (default: 60000)
   */
  timeout?: number;
  
  /**
   * Allowed MIME types (default: PDFs and common document formats)
   */
  allowedMimeTypes?: string[];
  
  /**
   * Storage folder (default: 'documents')
   */
  folder?: string;
}

const DEFAULT_OPTIONS: Required<DocumentDownloadOptions> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeout: 60000, // 60 seconds
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/html',
    // Additional formats that might be encountered
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
  folder: 'documents',
};

/**
 * Document Downloader
 * 
 * Downloads documents from URLs and stores in configured storage provider.
 */
export class DocumentDownloader {
  private storageProvider: IStorageProvider;
  
  constructor(storageProvider?: IStorageProvider) {
    this.storageProvider = storageProvider ?? getStorageProvider();
  }
  
  /**
   * Download document from URL
   */
  async download(
    url: string,
    options: DocumentDownloadOptions = {}
  ): Promise<DocumentDownloadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    logger.info({
      module: 'DocumentDownloader',
      operation: 'download',
      url,
    }, 'Starting document download');
    
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
      
      // Be lenient with content types for documents - some servers misconfigure them
      const isAllowedType = opts.allowedMimeTypes.includes(contentType) ||
        contentType === 'application/octet-stream' || // Generic binary
        contentType.startsWith('text/'); // Text-based documents
      
      if (!isAllowedType) {
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
      
      // Determine file extension - try URL first, then content type
      let ext = getExtensionFromUrl(url);
      if (!ext) {
        ext = getExtensionFromMimeType(contentType);
      }
      // Default to .pdf for application/octet-stream if URL suggests PDF
      if (!ext && url.toLowerCase().includes('pdf')) {
        ext = '.pdf';
      }
      if (!ext) {
        ext = '.bin';
      }
      
      // Extract original filename from URL if possible
      const originalFilename = this.extractFilenameFromUrl(url) || `document${ext}`;
      
      // Upload to storage
      const uploadResult = await this.storageProvider.upload(buffer, {
        folder: opts.folder,
        contentType: contentType === 'application/octet-stream' ? this.guessContentType(ext) : contentType,
      });
      
      logger.info({
        module: 'DocumentDownloader',
        operation: 'download',
        url,
        storageKey: uploadResult.storageKey,
        fileSize: uploadResult.fileSize,
        contentType: uploadResult.contentType,
      }, 'Document downloaded and stored successfully');
      
      return {
        success: true,
        filename: originalFilename,
        mimeType: uploadResult.contentType,
        fileSize: uploadResult.fileSize,
        storageKey: uploadResult.storageKey,
        url: uploadResult.url,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      
      logger.error({
        module: 'DocumentDownloader',
        operation: 'download',
        url,
        error: errorMessage,
        isTimeout,
      }, 'Document download failed');
      
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
   * Download multiple documents with concurrency control
   */
  async downloadBatch(
    urls: string[],
    options: DocumentDownloadOptions = {},
    concurrency: number = 3
  ): Promise<Map<string, DocumentDownloadResult>> {
    const results = new Map<string, DocumentDownloadResult>();
    
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
  
  /**
   * Guess content type from file extension
   */
  private guessContentType(ext: string): string {
    const extToMime: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.rtf': 'application/rtf',
    };
    
    return extToMime[ext.toLowerCase()] || 'application/octet-stream';
  }
}

// Singleton instance
let documentDownloaderInstance: DocumentDownloader | null = null;

export function getDocumentDownloader(): DocumentDownloader {
  if (!documentDownloaderInstance) {
    documentDownloaderInstance = new DocumentDownloader();
  }
  return documentDownloaderInstance;
}

/**
 * Reset the downloader instance (for testing)
 */
export function resetDocumentDownloader(): void {
  documentDownloaderInstance = null;
}
