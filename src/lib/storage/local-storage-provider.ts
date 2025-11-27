/**
 * Local Storage Provider (GS1 Foundation - Phase 4)
 * 
 * Stores files in the local filesystem under public/gs1-assets/
 * for development and simple deployments.
 * 
 * Files are served via Next.js static file serving from /gs1-assets/*
 */

import fs from 'fs/promises';
import path from 'path';
import {
  IStorageProvider,
  StorageProviderType,
  StorageUploadOptions,
  StorageUploadResult,
  generateUniqueFilename,
  getExtensionFromMimeType,
} from './storage-provider';
import logger from '@/lib/logger';

export interface LocalStorageOptions {
  /**
   * Base directory for storage (relative to project root)
   * Default: 'public/gs1-assets'
   */
  basePath?: string;
  
  /**
   * Base URL path for serving files
   * Default: '/gs1-assets'
   */
  baseUrl?: string;
}

export class LocalStorageProvider implements IStorageProvider {
  readonly providerId: StorageProviderType = 'local';
  
  private basePath: string;
  private baseUrl: string;
  
  constructor(options: LocalStorageOptions = {}) {
    this.basePath = options.basePath || 'public/gs1-assets';
    this.baseUrl = options.baseUrl || '/gs1-assets';
  }
  
  /**
   * Get the full filesystem path for a storage key
   */
  private getFilePath(storageKey: string): string {
    return path.join(process.cwd(), this.basePath, storageKey);
  }
  
  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  async upload(buffer: Buffer, options: StorageUploadOptions): Promise<StorageUploadResult> {
    const folder = options.folder || '';
    const contentType = options.contentType || 'application/octet-stream';
    
    // Generate filename
    let filename = options.filename;
    if (!filename) {
      const ext = getExtensionFromMimeType(contentType) || '.bin';
      filename = generateUniqueFilename(ext);
    }
    
    // Build storage key (folder/filename)
    const storageKey = folder ? `${folder}/${filename}` : filename;
    
    // Get full path and ensure directory exists
    const filePath = this.getFilePath(storageKey);
    const dirPath = path.dirname(filePath);
    await this.ensureDir(dirPath);
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    logger.info({
      module: 'LocalStorageProvider',
      operation: 'upload',
      storageKey,
      fileSize: buffer.length,
      contentType,
    }, 'File uploaded to local storage');
    
    return {
      storageKey,
      url: this.getUrl(storageKey),
      fileSize: buffer.length,
      contentType,
    };
  }
  
  getUrl(storageKey: string): string {
    // Return URL path for Next.js static serving
    return `${this.baseUrl}/${storageKey}`;
  }
  
  async delete(storageKey: string): Promise<void> {
    const filePath = this.getFilePath(storageKey);
    
    try {
      await fs.unlink(filePath);
      
      logger.info({
        module: 'LocalStorageProvider',
        operation: 'delete',
        storageKey,
      }, 'File deleted from local storage');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, that's fine
    }
  }
  
  async exists(storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(storageKey);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

