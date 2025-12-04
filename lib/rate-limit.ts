import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Dynamic import for ioredis to avoid Edge Runtime issues
let Redis: typeof import('ioredis').default | null = null;

// Check if we are in the Edge Runtime
const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

// Only import ioredis in Node.js runtime (not Edge)
if (!isEdgeRuntime && typeof process !== 'undefined' && process.versions?.node) {
  try {
    // Dynamic import to avoid Edge Runtime bundling issues
    // eslint-disable-next-line
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
  /**
   * Whether to fail closed (deny access) when Redis is unavailable.
   * Defaults to false (fail open).
   */
  failClosed?: boolean;
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
  private redis: import('ioredis').default;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.config.failClosed) {
        logger.error({
          module: 'rate-limit',
          operation: 'check',
          rateLimitId: this.config.id,
          error: errorMessage,
        }, 'Redis rate limiter error - failing closed');
        
        // Fail closed: deny request
        return {
          success: false,
          limit: this.config.limit,
          remaining: 0,
          reset: now + this.config.windowMs,
        };
      }

      logger.error({
        module: 'rate-limit',
        operation: 'check',
        rateLimitId: this.config.id,
        error: errorMessage,
      }, 'Redis rate limiter error - failing open');
      
      // Fail open: allow request
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
    if (typeof process !== 'undefined' && typeof process.once === 'function') {
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
  const isProduction = env.NODE_ENV === 'production';

  // In production, enforce Redis availability
  if (isProduction && !isEdgeRuntime) {
    if (!redisUrl || !Redis) {
      throw new Error('Redis is required for rate limiting in production');
    }
    
    try {
      logger.info({
        module: 'rate-limit',
        operation: 'createRateLimiter',
        rateLimitId: config.id,
        type: 'redis',
      }, `Using Redis for rate limiter: ${config.id}`);
      return new RedisRateLimiter(redisUrl, config);
    } catch (error) {
      // This catch block handles immediate instantiation errors
      const message = `Failed to create Redis rate limiter in production: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({
        module: 'rate-limit',
        operation: 'createRateLimiter',
        rateLimitId: config.id,
        error: error instanceof Error ? error.message : String(error),
      }, message);
      throw new Error(message);
    }
  }

  // Use Redis if available in non-production environments
  if (!isEdgeRuntime && redisUrl && Redis) {
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
    if (isEdgeRuntime && redisUrl) {
       logger.warn({
        module: 'rate-limit',
        operation: 'createRateLimiter',
        rateLimitId: config.id,
        type: 'in-memory',
      }, `Edge Runtime detected: Redis rate limiter disabled, falling back to in-memory. For distributed rate limiting in Edge, use a compatible adapter (e.g., @upstash/redis).`);
      
      if (isProduction) {
        logger.warn({
          module: 'rate-limit',
          operation: 'createRateLimiter',
          rateLimitId: config.id,
          environment: 'production',
        }, 'CRITICAL: Running in-memory rate limiting in Production on Edge Runtime. Rate limits will not be shared across instances.');
      }
    }

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

// Login attempts: 10 per 15 minutes
export const loginRateLimiter = createRateLimiter({
  id: 'login',
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  failClosed: true,
});

// Password reset: 3 per hour
export const passwordResetRateLimiter = createRateLimiter({
  id: 'password-reset',
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  failClosed: true,
});

// Invite acceptance: 10 per hour
export const inviteAcceptRateLimiter = createRateLimiter({
  id: 'invite-accept',
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  failClosed: true,
});

// Registration: 5 per hour (prevents spam signups)
export const registerRateLimiter = createRateLimiter({
  id: 'register',
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  failClosed: true,
});

// Magic link / login code requests: 5 per 10 minutes per email
// Prevents abuse of email sending and code generation
export const magicLinkRateLimiter = createRateLimiter({
  id: 'magic-link-request',
  limit: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  failClosed: true,
});

// Login code verification: 10 per 15 minutes (same as login)
// Reuses login limits since it's an alternative login method
export const loginCodeRateLimiter = createRateLimiter({
  id: 'login-code',
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  failClosed: true,
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

