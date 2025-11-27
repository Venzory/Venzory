/**
 * GS1 Enrichment API Route
 * 
 * POST /api/gs1/enrich/[productId]
 * 
 * Triggers GS1 enrichment for a product, fetching data from GDSN
 * and populating all related models (packaging, media, documents, etc.)
 */

import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { getProductEnrichmentService } from '@/src/services/products/product-enrichment-service';
import { apiHandlerContext } from '@/lib/api-handler';
import logger from '@/lib/logger';

interface RouteParams {
  params: Promise<{ productId: string }>;
}

/**
 * POST /api/gs1/enrich/[productId]
 * 
 * Enriches a product with GS1/GDSN data.
 * 
 * @returns {
 *   success: boolean,
 *   result: EnrichmentResult
 * }
 * 
 * EnrichmentResult contains:
 * - productId: string
 * - gtin: string | null
 * - enrichedFields: string[] - List of fields that were updated
 * - errors: string[] - Any errors encountered
 * - warnings: string[] - Non-critical warnings
 */
export const POST = apiHandlerContext(async (request: Request, { params }: RouteParams) => {
  const { productId } = await params;
  
  // Require authentication
  const { session } = await requireActivePractice();
  
  // Verify platform owner access
  if (!isPlatformOwner(session.user.email)) {
    return NextResponse.json(
      { error: 'Only the platform owner can trigger GS1 enrichment' },
      { status: 403 }
    );
  }
  
  if (!productId) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    );
  }
  
  logger.info({
    module: 'api/gs1/enrich',
    operation: 'POST',
    productId,
    userId: session.user.id,
  }, 'GS1 enrichment requested');
  
  try {
    const enrichmentService = getProductEnrichmentService();
    const result = await enrichmentService.enrichFromGdsn(productId);
    
    logger.info({
      module: 'api/gs1/enrich',
      operation: 'POST',
      productId,
      success: result.success,
      enrichedFields: result.enrichedFields.length,
      errors: result.errors.length,
      warnings: result.warnings.length,
    }, 'GS1 enrichment completed');
    
    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({
      module: 'api/gs1/enrich',
      operation: 'POST',
      productId,
      error: errorMessage,
    }, 'GS1 enrichment failed');
    
    return NextResponse.json(
      { 
        error: 'Enrichment failed', 
        details: errorMessage,
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/gs1/enrich/[productId]
 * 
 * Returns available mock GTINs for testing (development only).
 */
export const GET = apiHandlerContext(async (request: Request, { params }: RouteParams) => {
  const { productId } = await params;
  
  // Require authentication
  const { session } = await requireActivePractice();
  
  // Verify platform owner access
  if (!isPlatformOwner(session.user.email)) {
    return NextResponse.json(
      { error: 'Only the platform owner can access this endpoint' },
      { status: 403 }
    );
  }
  
  // Return list of available mock GTINs for testing
  const mockGtins = [
    { gtin: '4006501003638', description: 'Sterile Surgical Gloves (Size M)', type: 'Medical Device (IIa)' },
    { gtin: '8714632012345', description: 'Ibuprofen 400mg Tablets', type: 'Pharmaceutical' },
    { gtin: '5901234567890', description: 'Disposable Syringes 5ml', type: 'Medical Device (I)' },
    { gtin: '4260123456789', description: 'Adhesive Wound Dressing', type: 'Medical Device (I)' },
  ];
  
  return NextResponse.json({
    message: 'Available mock GTINs for testing',
    productId,
    mockGtins,
    usage: 'Create a product with one of these GTINs, then POST to this endpoint to enrich it.',
  });
});

