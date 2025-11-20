import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Configuration
const RETENTION_DAYS = 90;
const BATCH_SIZE = 1000;
const MAX_ITERATIONS = 50; // Safety limit to prevent timeouts (max 50k records per run)

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  
  // Require CRON_SECRET to be set and match the header
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    logger.info(
      { module: 'cron', operation: 'cleanup-audit-logs', cutoffDate },
      'Starting audit log cleanup'
    );

    let totalDeleted = 0;
    let iterations = 0;
    let hasMore = true;

    while (hasMore && iterations < MAX_ITERATIONS) {
      iterations++;

      // Find IDs to delete (fetch only IDs for performance)
      const logsToDelete = await prisma.auditLog.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        select: {
          id: true,
        },
        take: BATCH_SIZE,
      });

      if (logsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const ids = logsToDelete.map((log) => log.id);

      // Delete batch
      const result = await prisma.auditLog.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      totalDeleted += result.count;

      // If we found fewer than batch size, we are likely done
      if (logsToDelete.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    logger.info(
      {
        module: 'cron',
        operation: 'cleanup-audit-logs',
        totalDeleted,
        iterations,
        retentionDays: RETENTION_DAYS,
        completed: !hasMore
      },
      'Completed audit log cleanup'
    );

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      iterations,
      retentionDays: RETENTION_DAYS,
      completed: !hasMore // if hit max iterations, this might be false (meaning there is more to delete)
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

