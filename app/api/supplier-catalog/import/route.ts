/**
 * Supplier Catalog Import API
 * 
 * POST /api/supplier-catalog/import
 * Upload a CSV file to import supplier catalog items
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { apiHandler } from '@/lib/api-handler';
import { getSupplierImportService } from '@/src/services/import';
import { getCatalogUploadRepository } from '@/src/repositories/import';
import logger from '@/lib/logger';

export const POST = apiHandler(async (request: Request) => {
  // Verify platform owner access
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return NextResponse.json(
      { error: 'Unauthorized - Platform owner access required' },
      { status: 403 }
    );
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const globalSupplierId = formData.get('globalSupplierId') as string | null;

  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }

  if (!globalSupplierId) {
    return NextResponse.json(
      { error: 'globalSupplierId is required' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!file.name.endsWith('.csv')) {
    return NextResponse.json(
      { error: 'Only CSV files are supported' },
      { status: 400 }
    );
  }

  // Read file content
  const csvContent = await file.text();
  
  if (!csvContent.trim()) {
    return NextResponse.json(
      { error: 'CSV file is empty' },
      { status: 400 }
    );
  }

  // Get services
  const importService = getSupplierImportService();
  const uploadRepo = getCatalogUploadRepository();

  // Parse CSV to get row count
  const rows = importService.parseCSV(csvContent);
  
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'CSV file contains no valid data rows' },
      { status: 400 }
    );
  }

  // Create upload audit record
  const upload = await uploadRepo.create({
    globalSupplierId,
    filename: file.name,
    rawContent: csvContent,
    rowCount: rows.length,
    uploadedBy: session.user.id ?? session.user.email,
  });

  logger.info({
    module: 'SupplierCatalogImportAPI',
    operation: 'import',
    uploadId: upload.id,
    globalSupplierId,
    filename: file.name,
    rowCount: rows.length,
  }, 'Starting supplier catalog import');

  try {
    // Run import pipeline
    const result = await importService.importCatalog(
      globalSupplierId,
      rows,
      {
        integrationType: 'CSV',
        autoEnrich: true,
        createNewProducts: true,
        skipInvalidRows: true,
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
      module: 'SupplierCatalogImportAPI',
      operation: 'import',
      uploadId: upload.id,
      importId: result.importId,
      successCount: result.successCount,
      failedCount: result.failedCount,
      reviewCount: result.reviewCount,
      enrichedCount: result.enrichedCount,
    }, 'Supplier catalog import completed');

    // Return detailed results
    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      importId: result.importId,
      summary: {
        totalRows: result.totalRows,
        successCount: result.successCount,
        failedCount: result.failedCount,
        reviewCount: result.reviewCount,
        enrichedCount: result.enrichedCount,
      },
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
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Mark upload as failed
    await uploadRepo.markFailed(upload.id, errorMessage);

    logger.error({
      module: 'SupplierCatalogImportAPI',
      operation: 'import',
      uploadId: upload.id,
      error: errorMessage,
    }, 'Supplier catalog import failed');

    return NextResponse.json(
      { 
        error: 'Import failed', 
        details: errorMessage,
        uploadId: upload.id,
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/supplier-catalog/import
 * Get recent import history
 */
export const GET = apiHandler(async (request: Request) => {
  // Verify platform owner access
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return NextResponse.json(
      { error: 'Unauthorized - Platform owner access required' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const globalSupplierId = searchParams.get('globalSupplierId');

  const uploadRepo = getCatalogUploadRepository();

  const uploads = globalSupplierId
    ? await uploadRepo.findBySupplierId(globalSupplierId, limit)
    : await uploadRepo.findRecent(limit);

  // Return without raw content to keep response size reasonable
  return NextResponse.json({
    uploads: uploads.map((u) => ({
      id: u.id,
      globalSupplierId: u.globalSupplierId,
      supplierName: u.globalSupplier?.name,
      filename: u.filename,
      rowCount: u.rowCount,
      successCount: u.successCount,
      failedCount: u.failedCount,
      reviewCount: u.reviewCount,
      enrichedCount: u.enrichedCount,
      status: u.status,
      errorMessage: u.errorMessage,
      uploadedBy: u.uploadedBy,
      completedAt: u.completedAt,
      createdAt: u.createdAt,
    })),
  });
});

