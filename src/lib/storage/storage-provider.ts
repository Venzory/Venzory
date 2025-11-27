/**
 * Storage Provider Interface (GS1 Foundation - Phase 4)
 * 
 * Unified interface for storing and retrieving media/document assets.
 * Implementations: local filesystem, S3, Cloudinary, etc.
 */

export type StorageProviderType = 'local' | 's3' | 'cloudinary';

export interface StorageUploadOptions {
  /**
   * Subfolder within the storage (e.g., 'media', 'documents')
   */
  folder?: string;
  
  /**
   * Custom filename (without extension). If not provided, a unique name is generated.
   */
  filename?: string;
  
  /**
   * Content type / MIME type of the file
   */
  contentType?: string;
  
  /**
   * Additional metadata to store with the file
   */
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  /**
   * Unique key/path to retrieve the file
   */
  storageKey: string;
  
  /**
   * Public URL to access the file (if applicable)
   */
  url: string;
  
  /**
   * File size in bytes
   */
  fileSize: number;
  
  /**
   * Content type / MIME type
   */
  contentType: string;
}

export interface IStorageProvider {
  /**
   * Provider identifier
   */
  readonly providerId: StorageProviderType;
  
  /**
   * Upload a file to storage
   * 
   * @param buffer - File content as Buffer
   * @param options - Upload options (folder, filename, contentType)
   * @returns Upload result with storage key and URL
   */
  upload(buffer: Buffer, options: StorageUploadOptions): Promise<StorageUploadResult>;
  
  /**
   * Get the public URL for a stored file
   * 
   * @param storageKey - The storage key returned from upload
   * @returns Public URL to access the file
   */
  getUrl(storageKey: string): string;
  
  /**
   * Delete a file from storage
   * 
   * @param storageKey - The storage key of the file to delete
   */
  delete(storageKey: string): Promise<void>;
  
  /**
   * Check if a file exists in storage
   * 
   * @param storageKey - The storage key to check
   * @returns true if file exists
   */
  exists(storageKey: string): Promise<boolean>;
}

/**
 * Generate a unique filename with timestamp and random suffix
 */
export function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${extension}`;
}

/**
 * Extract file extension from URL or filename
 */
export function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1].toLowerCase()}` : '';
  } catch {
    // If not a valid URL, try to extract extension directly
    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1].toLowerCase()}` : '';
  }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    // Images
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    // Videos
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    // Documents
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/html': '.html',
  };
  
  return mimeToExt[mimeType] || '';
}

