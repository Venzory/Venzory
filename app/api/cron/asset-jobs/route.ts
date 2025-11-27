/**
 * Asset Download Jobs Cron Endpoint (GS1 Foundation - Phase 4)
 * 
 * Processes pending media and document download jobs.
 * Call via: GET /api/cron/asset-jobs
 * 
 * Authentication via Bearer token matching CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAssetJobs, cleanupOldJobs, getAssetJobStats } from '@/src/lib/jobs/asset-queue';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Prevent caching of this route
export const dynamic = 'force-dynamic';

// Increase timeout for asset processing (may take longer than default)
export const maxDuration = 60; // 60 seconds

export async function GET(request: NextRequest) {
  // Basic authentication to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  
  // Require CRON_SECRET to be set and match the header
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    logger.info({ module: 'cron', operation: 'asset-jobs' }, 'Starting asset job processing');
    
    // Process pending jobs
    const result = await processAssetJobs();
    
    // Cleanup old completed jobs (best effort, don't fail if this errors)
    let cleanedUp = 0;
    try {
      cleanedUp = await cleanupOldJobs();
    } catch (cleanupError) {
      logger.warn({
        module: 'cron',
        operation: 'asset-jobs',
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      }, 'Failed to cleanup old jobs');
    }
    
    // Get current stats
    const stats = await getAssetJobStats();
    
    logger.info({
      module: 'cron',
      operation: 'asset-jobs',
      result,
      cleanedUp,
      stats,
    }, 'Completed asset job processing');
    
    return NextResponse.json({
      success: true,
      ...result,
      cleanedUp,
      stats,
    });
  } catch (error) {
    logger.error({
      module: 'cron',
      operation: 'asset-jobs',
      error: error instanceof Error ? error.message : String(error),
    }, 'Asset jobs cron failed');
    
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

