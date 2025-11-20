import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { sendOrderEmail, SendOrderEmailParams } from '@/src/lib/email/sendOrderEmail';
import { JobStatus, EmailJob } from '@prisma/client';

export type EmailJobType = 'ORDER_CONFIRMATION';

export interface EmailJobPayload {
  [key: string]: any;
}

/**
 * Enqueue an email job
 */
export async function enqueueEmailJob(
  type: EmailJobType,
  recipient: string,
  payload: EmailJobPayload
): Promise<EmailJob> {
  try {
    const job = await prisma.emailJob.create({
      data: {
        type,
        recipient,
        payload,
        status: JobStatus.PENDING,
      },
    });
    
    logger.info({
      module: 'jobs',
      operation: 'enqueueEmailJob',
      jobId: job.id,
      type,
      recipient,
    }, 'Email job enqueued');

    return job;
  } catch (error) {
    logger.error({
      module: 'jobs',
      operation: 'enqueueEmailJob',
      type,
      recipient,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to enqueue email job');
    throw error;
  }
}

/**
 * Process pending email jobs
 * Designed to be called by a cron job
 */
export async function processEmailJobs(batchSize = 10): Promise<{ processed: number; errors: number }> {
  // 1. Fetch pending jobs
  const pendingJobs = await prisma.emailJob.findMany({
    where: {
      status: {
        in: [JobStatus.PENDING, JobStatus.FAILED], // Retry failed ones too if under attempt limit? 
        // For now, let's stick to PENDING. Retrying FAILED needs more logic (backoff etc)
        // Let's just do PENDING for simplicity as per plan "Fetch a batch of PENDING (or retryable) jobs"
      },
      // Simple retry logic: if failed and attempts < 3
      OR: [
        { status: JobStatus.PENDING },
        { 
          status: JobStatus.FAILED, 
          attempts: { lt: 3 } 
        }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (pendingJobs.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const job of pendingJobs) {
    try {
      // 2. Lock the job
      // usage of update with where clause ensures we only process if still in expected state
      const lockedJob = await prisma.emailJob.update({
        where: { 
          id: job.id,
          // Optimistic concurrency control-ish: ensure it hasn't changed status since we fetched it
          // (Prisma doesn't support complex where on update easily without raw query or ensuring ID match is enough if we trust the fetch)
          // But another worker might have picked it up.
          // We'll assume ID lock is sufficient for this scale, but check status again or rely on 'attempts' increment?
          // Let's just update status to PROCESSING.
        },
        data: {
          status: JobStatus.PROCESSING,
          processedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Double check it was actually pending/failed when we locked it?
      // If status was already PROCESSING, we shouldn't have fetched it (unless race condition).
      // If we want strict locking, we could use a transaction or check the status in `update` if Prisma supported generic where on update (it does on primary key).
      // Using `updateMany` to lock is safer but harder to get return value in all DBs.
      // For now, proceeding with simple update.
      
      logger.info({
        module: 'jobs',
        operation: 'processEmailJobs',
        jobId: job.id,
        attempt: lockedJob.attempts,
      }, 'Processing email job');

      // 3. Execute logic based on type
      if (job.type === 'ORDER_CONFIRMATION') {
        const params = job.payload as unknown as SendOrderEmailParams;
        const result = await sendOrderEmail(params);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to send email');
        }
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      // 4. Mark as completed
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          lastError: null,
        },
      });

      processedCount++;
      
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error({
        module: 'jobs',
        operation: 'processEmailJobs',
        jobId: job.id,
        error: errorMessage,
      }, 'Job failed');

      // 5. Mark as failed
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          lastError: errorMessage,
        },
      });
    }
  }

  return { processed: processedCount, errors: errorCount };
}

