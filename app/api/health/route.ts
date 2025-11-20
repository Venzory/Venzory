import { NextResponse } from 'next/server';
import Redis from 'ioredis';

import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-handler';
import { resend } from '@/lib/email';
import { env } from '@/lib/env';

export const GET = apiHandler(async () => {
  const services: Record<string, any> = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    email: { status: 'unknown' },
  };

  // Database Check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    services.database = {
      status: 'down',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }

  // Redis Check
  if (env.REDIS_URL) {
    const redisStart = Date.now();
    let redis: Redis | null = null;
    try {
      redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 0,
        connectTimeout: 3000, // 3s timeout
        lazyConnect: true,
      });
      
      await redis.connect();
      await redis.ping();
      
      services.redis = {
        status: 'up',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      services.redis = {
        status: 'down',
        latency: Date.now() - redisStart,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    } finally {
      if (redis) {
        await redis.quit().catch(() => {});
      }
    }
  } else {
    services.redis = {
      status: 'not_configured',
    };
  }

  // Email Check (Configuration only)
  if (env.RESEND_API_KEY) {
    if (resend) {
      services.email = {
        status: 'up',
      };
    } else {
      services.email = {
        status: 'down',
        error: 'Client initialization failed',
      };
    }
  } else {
    services.email = {
      status: 'not_configured',
    };
  }

  // Determine overall status
  const isDbUp = services.database.status === 'up';
  const isRedisHealthy = services.redis.status !== 'down';
  
  let status: 'ok' | 'degraded' | 'error' = 'ok';
  let httpStatus = 200;

  if (!isDbUp) {
    status = 'error';
    httpStatus = 503;
  } else if (!isRedisHealthy) {
    status = 'degraded';
  }

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    services,
  }, { status: httpStatus });
});
