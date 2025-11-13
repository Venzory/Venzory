import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Dynamic import for ioredis to avoid Edge Runtime issues
let Redis: typeof import('ioredis').default | null = null;

// Only import ioredis in Node.js runtime (not Edge)
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    // Dynamic import to avoid Edge Runtime bundling issues
    Redis = require('ioredis');
  } catch (error) {
    logger.warn({
      module: 'rate-limit',
      operation: 'init',
      error: error instanceof Error ? error.message : String(error),
    }, 'ioredis not available, using in-memory fallback');
  }
}

export type RateLimitConfig = {
  /**
   * Unique identifier for this rate limiter (e.g., 'login', 'password-reset')
   */
  id: string;
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Interface for rate limiting implementations
 */
interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/**
 * Redis-based rate limiter implementation
 */
class RedisRateLimiter implements RateLimiter {
  private redis: any;
  private config: RateLimitConfig;

  constructor(redisUrl: string, config: RateLimitConfig) {
    if (!Redis) {
      throw new Error('Redis not available in this runtime');
    }
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.config = config;
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = `rate-limit:${this.config.id}:${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis sorted set with timestamps as scores
      const multi = this.redis.multi();

      // Remove old entries outside the time window
      multi.zremrangebyscore(redisKey, 0, windowStart);

      // Count current entries
      multi.zcard(redisKey);

      // Add current request
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      multi.expire(redisKey, Math.ceil(this.config.windowMs / 1000));

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis transaction failed');
      }

      // Get count before adding current request (index 1 in results)
      const count = (results[1][1] as number) || 0;

      const success = count < this.config.limit;
      const remaining = Math.max(0, this.config.limit - count - 1);
      const reset = now + this.config.windowMs;

      return {
        success,
        limit: this.config.limit,
        remaining,
        reset,
      };
    } catch (error) {
      logger.error({
        module: 'rate-limit',
        operation: 'check',
        rateLimitId: this.config.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Redis rate limiter error - failing open');
      // On error, allow the request (fail open)
      return {
        success: true,
        limit: this.config.limit,
        remaining: this.config.limit - 1,
        reset: now + this.config.windowMs,
      };
    }
  }

  async reset(key: string): Promise<void> {
    const redisKey = `rate-limit:${this.config.id}:${key}`;
    try {
      await this.redis.del(redisKey);
    } catch (error) {
      logger.error({
        module: 'rate-limit',
        operation: 'reset',
        rateLimitId: this.config.id,
        key,
        error: error instanceof Error ? error.message : String(error),
      }, 'Redis rate limiter reset error');
    }
  }
}

/**
 * In-memory rate limiter implementation (for development/testing)
 */
class InMemoryRateLimiter implements RateLimiter {
  private store: Map<string, number[]> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Ensure cleanup happens on process exit
    if (typeof process !== 'undefined') {
      process.once('beforeExit', () => {
        clearInterval(this.cleanupInterval);
      });
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const storeKey = `${this.config.id}:${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing timestamps for this key
    let timestamps = this.store.get(storeKey) || [];

    // Filter out old timestamps outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    const count = timestamps.length;
    const success = count < this.config.limit;

    if (success) {
      // Add current timestamp
      timestamps.push(now);
      this.store.set(storeKey, timestamps);
    }

    const remaining = Math.max(0, this.config.limit - count - (success ? 1 : 0));
    const reset = now + this.config.windowMs;

    return {
      success,
      limit: this.config.limit,
      remaining,
      reset,
    };
  }

  async reset(key: string): Promise<void> {
    const storeKey = `${this.config.id}:${key}`;
    this.store.delete(storeKey);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const windowStart = now - this.config.windowMs;
      const filtered = timestamps.filter((ts) => ts > windowStart);
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }
}

/**
 * Create a rate limiter instance based on environment configuration
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const redisUrl = env.REDIS_URL;

  // Use Redis only if URL is configured AND Redis client is available
  if (redisUrl && Redis) {
    try {
      logger.info({
        module: 'rate-limit',
        operation: 'createRateLimiter',
        rateLimitId: config.id,
        type: 'redis',
      }, `Using Redis for rate limiter: ${config.id}`);
      return new RedisRateLimiter(redisUrl, config);
    } catch (error) {
      logger.warn({
        module: 'rate-limit',
        operation: 'createRateLimiter',
        rateLimitId: config.id,
        error: error instanceof Error ? error.message : String(error),
      }, `Failed to create Redis rate limiter, falling back to in-memory`);
      return new InMemoryRateLimiter(config);
    }
  } else {
    logger.info({
      module: 'rate-limit',
      operation: 'createRateLimiter',
      rateLimitId: config.id,
      type: 'in-memory',
    }, `Using in-memory rate limiter: ${config.id}`);
    return new InMemoryRateLimiter(config);
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Login attempts: 5 per 15 minutes
export const loginRateLimiter = createRateLimiter({
  id: 'login',
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

// Password reset: 3 per hour
export const passwordResetRateLimiter = createRateLimiter({
  id: 'password-reset',
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
});

// Invite acceptance: 10 per hour
export const inviteAcceptRateLimiter = createRateLimiter({
  id: 'invite-accept',
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Helper to get client IP from request
 */
export function getClientIp(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

