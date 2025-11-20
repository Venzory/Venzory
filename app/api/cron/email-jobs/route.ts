import { NextRequest, NextResponse } from 'next/server';
import { processEmailJobs } from '@/src/lib/jobs/email-queue';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Prevent caching of this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Basic authentication to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  
  // Require CRON_SECRET to be set and match the header
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info({ module: 'cron', operation: 'email-jobs' }, 'Starting email job processing');
    
    const result = await processEmailJobs();
    
    logger.info({ 
      module: 'cron', 
      operation: 'email-jobs', 
      result 
    }, 'Completed email job processing');

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error({
      module: 'cron',
      operation: 'email-jobs',
      error: error instanceof Error ? error.message : String(error),
    }, 'Cron job failed');

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

