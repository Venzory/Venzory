/**
 * Asset Download Job Queue (GS1 Foundation - Phase 4)
 * 
 * Handles background downloading of media and document assets.
 * Jobs are processed via a cron endpoint similar to email jobs.
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { JobStatus, AssetJobType } from '@prisma/client';
import { getMediaDownloader } from '@/src/services/media';
import { getDocumentDownloader } from '@/src/services/documents';
import { MediaRepository, DocumentRepository } from '@/src/repositories/products';

export interface AssetJobResult {
  processed: number;
  errors: number;
  mediaDownloaded: number;
  documentsDownloaded: number;
}

/**
 * Enqueue a media download job
 */
export async function enqueueMediaDownloadJob(
  mediaId: string,
  productId: string,
  sourceUrl: string
): Promise<void> {
  try {
    // Check if job already exists for this asset
    const existing = await prisma.assetJob.findFirst({
      where: {
        assetId: mediaId,
        type: AssetJobType.MEDIA_DOWNLOAD,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
    });
    
    if (existing) {
      logger.info({
        module: 'asset-queue',
        operation: 'enqueueMediaDownloadJob',
        mediaId,
        existingJobId: existing.id,
      }, 'Media download job already exists, skipping');
      return;
    }
    
    await prisma.assetJob.create({
      data: {
        type: AssetJobType.MEDIA_DOWNLOAD,
        assetId: mediaId,
        productId,
        sourceUrl,
        status: JobStatus.PENDING,
      },
    });
    
    logger.info({
      module: 'asset-queue',
      operation: 'enqueueMediaDownloadJob',
      mediaId,
      productId,
      sourceUrl,
    }, 'Media download job enqueued');
  } catch (error) {
    logger.error({
      module: 'asset-queue',
      operation: 'enqueueMediaDownloadJob',
      mediaId,
      productId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to enqueue media download job');
    throw error;
  }
}

/**
 * Enqueue a document download job
 */
export async function enqueueDocumentDownloadJob(
  documentId: string,
  productId: string,
  sourceUrl: string
): Promise<void> {
  try {
    // Check if job already exists for this asset
    const existing = await prisma.assetJob.findFirst({
      where: {
        assetId: documentId,
        type: AssetJobType.DOCUMENT_DOWNLOAD,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
    });
    
    if (existing) {
      logger.info({
        module: 'asset-queue',
        operation: 'enqueueDocumentDownloadJob',
        documentId,
        existingJobId: existing.id,
      }, 'Document download job already exists, skipping');
      return;
    }
    
    await prisma.assetJob.create({
      data: {
        type: AssetJobType.DOCUMENT_DOWNLOAD,
        assetId: documentId,
        productId,
        sourceUrl,
        status: JobStatus.PENDING,
      },
    });
    
    logger.info({
      module: 'asset-queue',
      operation: 'enqueueDocumentDownloadJob',
      documentId,
      productId,
      sourceUrl,
    }, 'Document download job enqueued');
  } catch (error) {
    logger.error({
      module: 'asset-queue',
      operation: 'enqueueDocumentDownloadJob',
      documentId,
      productId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to enqueue document download job');
    throw error;
  }
}

/**
 * Enqueue download jobs for all media assets of a product
 */
export async function enqueueMediaDownloadsForProduct(productId: string): Promise<number> {
  const mediaRepo = new MediaRepository();
  const mediaItems = await mediaRepo.findByProductId(productId);
  
  let enqueued = 0;
  
  for (const media of mediaItems) {
    // Skip if already downloaded (has storageKey)
    if (media.storageKey) {
      continue;
    }
    
    await enqueueMediaDownloadJob(media.id, productId, media.url);
    enqueued++;
  }
  
  return enqueued;
}

/**
 * Enqueue download jobs for all documents of a product
 */
export async function enqueueDocumentDownloadsForProduct(productId: string): Promise<number> {
  const documentRepo = new DocumentRepository();
  const documents = await documentRepo.findByProductId(productId);
  
  let enqueued = 0;
  
  for (const doc of documents) {
    // Skip if already downloaded (has storageKey)
    if (doc.storageKey) {
      continue;
    }
    
    await enqueueDocumentDownloadJob(doc.id, productId, doc.url);
    enqueued++;
  }
  
  return enqueued;
}

/**
 * Process pending asset download jobs
 * Designed to be called by a cron job
 */
export async function processAssetJobs(batchSize = 10): Promise<AssetJobResult> {
  const result: AssetJobResult = {
    processed: 0,
    errors: 0,
    mediaDownloaded: 0,
    documentsDownloaded: 0,
  };
  
  // Fetch pending or retryable jobs
  const pendingJobs = await prisma.assetJob.findMany({
    where: {
      OR: [
        { status: JobStatus.PENDING },
        {
          status: JobStatus.FAILED,
          attempts: { lt: 3 }, // Retry up to 3 times
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });
  
  if (pendingJobs.length === 0) {
    return result;
  }
  
  const mediaDownloader = getMediaDownloader();
  const documentDownloader = getDocumentDownloader();
  const mediaRepo = new MediaRepository();
  const documentRepo = new DocumentRepository();
  
  for (const job of pendingJobs) {
    try {
      // Lock the job by setting status to PROCESSING
      await prisma.assetJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          processedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      
      logger.info({
        module: 'asset-queue',
        operation: 'processAssetJobs',
        jobId: job.id,
        type: job.type,
        assetId: job.assetId,
        attempt: job.attempts + 1,
      }, 'Processing asset job');
      
      if (job.type === AssetJobType.MEDIA_DOWNLOAD) {
        // Download media
        const downloadResult = await mediaDownloader.download(job.sourceUrl);
        
        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Download failed');
        }
        
        // Update media record with storage info
        await mediaRepo.update(job.assetId, {
          storageProvider: 'local',
          storageKey: downloadResult.storageKey,
          filename: downloadResult.filename,
          mimeType: downloadResult.mimeType,
          fileSize: downloadResult.fileSize,
        });
        
        result.mediaDownloaded++;
        
      } else if (job.type === AssetJobType.DOCUMENT_DOWNLOAD) {
        // Download document
        const downloadResult = await documentDownloader.download(job.sourceUrl);
        
        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Download failed');
        }
        
        // Update document record with storage info
        await documentRepo.update(job.assetId, {
          storageProvider: 'local',
          storageKey: downloadResult.storageKey,
          filename: downloadResult.filename,
          mimeType: downloadResult.mimeType,
          fileSize: downloadResult.fileSize,
        });
        
        result.documentsDownloaded++;
        
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }
      
      // Mark as completed
      await prisma.assetJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          lastError: null,
        },
      });
      
      result.processed++;
      
    } catch (error) {
      result.errors++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error({
        module: 'asset-queue',
        operation: 'processAssetJobs',
        jobId: job.id,
        error: errorMessage,
      }, 'Asset job failed');
      
      // Mark as failed
      await prisma.assetJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          lastError: errorMessage,
        },
      });
    }
  }
  
  logger.info({
    module: 'asset-queue',
    operation: 'processAssetJobs',
    result,
  }, 'Asset job processing completed');
  
  return result;
}

/**
 * Get statistics about asset jobs
 */
export async function getAssetJobStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.assetJob.count({ where: { status: JobStatus.PENDING } }),
    prisma.assetJob.count({ where: { status: JobStatus.PROCESSING } }),
    prisma.assetJob.count({ where: { status: JobStatus.COMPLETED } }),
    prisma.assetJob.count({ where: { status: JobStatus.FAILED } }),
  ]);
  
  return { pending, processing, completed, failed };
}

/**
 * Cleanup old completed jobs (older than 7 days)
 */
export async function cleanupOldJobs(daysOld = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await prisma.assetJob.deleteMany({
    where: {
      status: JobStatus.COMPLETED,
      processedAt: { lt: cutoffDate },
    },
  });
  
  if (result.count > 0) {
    logger.info({
      module: 'asset-queue',
      operation: 'cleanupOldJobs',
      deleted: result.count,
    }, 'Cleaned up old asset jobs');
  }
  
  return result.count;
}

