'use server';

import { isPlatformOwner } from '@/lib/owner-guard';
import { getSupplierImportService } from '@/src/services/import';
import { getCatalogUploadRepository } from '@/src/repositories/import';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import logger from '@/lib/logger';

export interface ImportItemResult {
  rowIndex: number;
  success: boolean;
  productId: string | null;
  supplierItemId: string | null;
  matchMethod: string | null;
  matchConfidence: number | null;
  needsReview: boolean;
  enriched: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadCatalogResult {
  success?: boolean;
  error?: string;
  uploadId?: string;
  importId?: string;
  totalRows?: number;
  successCount?: number;
  failedCount?: number;
  reviewCount?: number;
  enrichedCount?: number;
  items?: ImportItemResult[];
}

export async function uploadCatalog(
  supplierId: string, 
  formData: FormData
): Promise<UploadCatalogResult> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { error: 'No file uploaded' };
  }

  // Validate file type
  if (!file.name.endsWith('.csv')) {
    return { error: 'Only CSV files are supported' };
  }

  const csvContent = await file.text();
  
  if (!csvContent.trim()) {
    return { error: 'CSV file is empty' };
  }

  // Get services
  const importService = getSupplierImportService();
  const uploadRepo = getCatalogUploadRepository();

  // Parse CSV
  const rows = importService.parseCSV(csvContent);
  
  if (rows.length === 0) {
    return { error: 'CSV file contains no valid data rows. Expected columns: sku, gtin, name, brand, description, price, currency, min_qty, stock, lead_time' };
  }

  // Create upload audit record
  const upload = await uploadRepo.create({
    globalSupplierId: supplierId,
    filename: file.name,
    rawContent: csvContent,
    rowCount: rows.length,
    uploadedBy: session.user.id ?? session.user.email,
  });

  logger.info({
    module: 'AdminSupplierActions',
    operation: 'uploadCatalog',
    uploadId: upload.id,
    supplierId,
    filename: file.name,
    rowCount: rows.length,
  }, 'Starting supplier catalog import via server action');

  try {
    // Run import pipeline with full matching and enrichment
    const result = await importService.importCatalog(
      supplierId,
      rows,
      {
        integrationType: 'CSV',
        autoEnrich: true,
        createNewProducts: true,
        skipInvalidRows: true,
        minAutoMatchConfidence: 0.90,
        defaultCurrency: 'EUR',
      }
    );

    // Update upload record with results
    await uploadRepo.markCompleted(upload.id, {
      successCount: result.successCount,
      failedCount: result.failedCount,
      reviewCount: result.reviewCount,
      enrichedCount: result.enrichedCount,
    });

    logger.info({
      module: 'AdminSupplierActions',
      operation: 'uploadCatalog',
      uploadId: upload.id,
      importId: result.importId,
      successCount: result.successCount,
      failedCount: result.failedCount,
      reviewCount: result.reviewCount,
      enrichedCount: result.enrichedCount,
    }, 'Supplier catalog import completed');

    // Revalidate the supplier page
    revalidatePath(`/admin/suppliers/${supplierId}`);

    // Return detailed results
    return {
      success: true,
      uploadId: upload.id,
      importId: result.importId,
      totalRows: result.totalRows,
      successCount: result.successCount,
      failedCount: result.failedCount,
      reviewCount: result.reviewCount,
      enrichedCount: result.enrichedCount,
      items: result.items.map((item) => ({
        rowIndex: item.rowIndex,
        success: item.success,
        productId: item.productId,
        supplierItemId: item.supplierItemId,
        matchMethod: item.matchMethod,
        matchConfidence: item.matchConfidence,
        needsReview: item.needsReview,
        enriched: item.enriched,
        errors: item.errors,
        warnings: item.warnings,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Mark upload as failed
    await uploadRepo.markFailed(upload.id, errorMessage);

    logger.error({
      module: 'AdminSupplierActions',
      operation: 'uploadCatalog',
      uploadId: upload.id,
      error: errorMessage,
    }, 'Supplier catalog import failed');

    return { 
      error: `Import failed: ${errorMessage}`,
      uploadId: upload.id,
    };
  }
}

/**
 * Get recent uploads for a supplier
 */
export async function getSupplierUploads(supplierId: string, limit: number = 10) {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const uploadRepo = getCatalogUploadRepository();
  const uploads = await uploadRepo.findBySupplierId(supplierId, limit);

  return uploads.map((u) => ({
    id: u.id,
    filename: u.filename,
    rowCount: u.rowCount,
    successCount: u.successCount,
    failedCount: u.failedCount,
    reviewCount: u.reviewCount,
    enrichedCount: u.enrichedCount,
    status: u.status,
    errorMessage: u.errorMessage,
    createdAt: u.createdAt,
    completedAt: u.completedAt,
  }));
}

