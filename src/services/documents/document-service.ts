/**
 * Document Service (GS1 Foundation - Phase 1)
 * 
 * Handles product document management (IFU, SDS, CE declarations, etc.).
 * Phase 1: Service skeleton with basic CRUD
 * Phase 4: Document download and storage integration
 */

import {
  DocumentRepository,
  type ProductDocument,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DocumentFilters,
} from '@/src/repositories/products';
import type { DocumentType } from '@prisma/client';
import logger from '@/lib/logger';

export interface DocumentServiceOptions {
  storageProvider?: 'local' | 's3' | 'cloudinary';
}

export class DocumentService {
  constructor(
    private documentRepo: DocumentRepository = new DocumentRepository(),
    private options: DocumentServiceOptions = { storageProvider: 'local' }
  ) {}
  
  /**
   * Get all documents for a product
   */
  async getProductDocuments(productId: string): Promise<ProductDocument[]> {
    return this.documentRepo.findByProductId(productId);
  }
  
  /**
   * Get documents by type
   */
  async getDocumentsByType(productId: string, type: DocumentType): Promise<ProductDocument[]> {
    return this.documentRepo.findByType(productId, type);
  }
  
  /**
   * Get document by type and language
   */
  async getDocumentByTypeAndLanguage(
    productId: string,
    type: DocumentType,
    language: string
  ): Promise<ProductDocument | null> {
    return this.documentRepo.findByTypeAndLanguage(productId, type, language);
  }
  
  /**
   * Add document to product
   */
  async addDocument(input: CreateDocumentInput): Promise<ProductDocument> {
    logger.info({
      module: 'DocumentService',
      operation: 'addDocument',
      productId: input.productId,
      type: input.type,
      title: input.title,
    }, 'Adding document to product');
    
    return this.documentRepo.create(input);
  }
  
  /**
   * Update document
   */
  async updateDocument(id: string, input: UpdateDocumentInput): Promise<ProductDocument> {
    logger.info({
      module: 'DocumentService',
      operation: 'updateDocument',
      documentId: id,
    }, 'Updating document');
    
    return this.documentRepo.update(id, input);
  }
  
  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    logger.info({
      module: 'DocumentService',
      operation: 'deleteDocument',
      documentId: id,
    }, 'Deleting document');
    
    // TODO (Phase 4): Also delete from storage provider
    
    return this.documentRepo.delete(id);
  }
  
  /**
   * Count documents for a product
   */
  async countDocuments(productId: string): Promise<number> {
    return this.documentRepo.countByProductId(productId);
  }
  
  /**
   * Check if product has required documents (IFU for medical devices)
   */
  async hasRequiredDocuments(productId: string): Promise<{
    hasIfu: boolean;
    hasSds: boolean;
    hasCeDeclaration: boolean;
  }> {
    const [ifu, sds, ce] = await Promise.all([
      this.documentRepo.countByType(productId, 'IFU'),
      this.documentRepo.countByType(productId, 'SDS'),
      this.documentRepo.countByType(productId, 'CE_DECLARATION'),
    ]);
    
    return {
      hasIfu: ifu > 0,
      hasSds: sds > 0,
      hasCeDeclaration: ce > 0,
    };
  }
  
  /**
   * Find documents expiring soon
   */
  async findExpiringDocuments(daysUntilExpiry: number = 30): Promise<ProductDocument[]> {
    return this.documentRepo.findExpiring(daysUntilExpiry);
  }
  
  /**
   * Download and store document from URL
   * 
   * TODO (Phase 4): Implement actual download and storage
   */
  async downloadAndStore(
    productId: string,
    document: {
      type: DocumentType;
      title: string;
      language?: string;
      url: string;
      filename?: string;
      effectiveDate?: Date;
      expirationDate?: Date;
      version?: string;
    }
  ): Promise<ProductDocument> {
    logger.info({
      module: 'DocumentService',
      operation: 'downloadAndStore',
      productId,
      url: document.url,
      type: document.type,
    }, 'Download and store not implemented (Phase 4) - storing URL only');
    
    // Phase 1: Just store the URL reference
    // Phase 4: Download the file and store in storage provider
    return this.addDocument({
      productId,
      type: document.type,
      title: document.title,
      language: document.language ?? 'en',
      url: document.url,
      filename: document.filename ?? null,
      effectiveDate: document.effectiveDate ?? null,
      expirationDate: document.expirationDate ?? null,
      version: document.version ?? null,
      storageProvider: 'local', // Will be updated in Phase 4
      storageKey: null, // Will be populated when downloaded
    });
  }
  
  /**
   * Batch download and store documents
   * 
   * TODO (Phase 4): Implement parallel download with rate limiting
   */
  async batchDownloadAndStore(
    productId: string,
    documents: Array<{
      type: DocumentType;
      title: string;
      language?: string;
      url: string;
      filename?: string;
      effectiveDate?: Date;
      expirationDate?: Date;
      version?: string;
    }>
  ): Promise<{ success: number; failed: number; documents: ProductDocument[] }> {
    const results: ProductDocument[] = [];
    let failed = 0;
    
    for (const doc of documents) {
      try {
        const document = await this.downloadAndStore(productId, doc);
        results.push(document);
      } catch (error) {
        failed++;
        logger.error({
          module: 'DocumentService',
          operation: 'batchDownloadAndStore',
          productId,
          url: doc.url,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to download document');
      }
    }
    
    return {
      success: results.length,
      failed,
      documents: results,
    };
  }
}

// Singleton instance
let documentServiceInstance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
  if (!documentServiceInstance) {
    documentServiceInstance = new DocumentService();
  }
  return documentServiceInstance;
}

