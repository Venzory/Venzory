import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import logger from '@/lib/logger';
import { getAuditService } from '@/src/services/audit/audit-service';

export const dynamic = 'force-dynamic';

// Configuration
const RETENTION_DAYS = 90;
const BATCH_SIZE = 1000;

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  
  // Require CRON_SECRET to be set and match the header
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info(
      { module: 'cron', operation: 'cleanup-audit-logs', retentionDays: RETENTION_DAYS },
      'Starting audit log cleanup'
    );

    const auditService = getAuditService();
    const { deleted } = await auditService.cleanupOldLogs(RETENTION_DAYS, BATCH_SIZE);

    logger.info(
      {
        module: 'cron',
        operation: 'cleanup-audit-logs',
        totalDeleted: deleted,
        retentionDays: RETENTION_DAYS,
      },
      'Completed audit log cleanup'
    );

    return NextResponse.json({
      success: true,
      deleted,
      retentionDays: RETENTION_DAYS,
    });

  } catch (error) {
    logger.error(
      {
        module: 'cron',
        operation: 'cleanup-audit-logs',
        error: error instanceof Error ? error.message : String(error),
      },
      'Audit log cleanup failed'
    );

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
