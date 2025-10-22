import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RateLimitResult } from '@/types/api';
import * as logger from '@/utils/logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('Missing Redis configuration');
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

// Free tier - IP-based rate limiting
let freeTierLimiter: Ratelimit | null = null;

function getFreeTierLimiter(): Ratelimit {
  if (!freeTierLimiter) {
    const limit = parseInt(process.env.FREE_TIER_LIMIT || '10', 10);

    freeTierLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(limit, '24 h'),
      prefix: 'ratelimit:free',
      analytics: true,
    });
  }

  return freeTierLimiter;
}

// Paid tier - API key-based rate limiting
let paidTierLimiterPerMinute: Ratelimit | null = null;

function getPaidTierLimiter(): Ratelimit {
  if (!paidTierLimiterPerMinute) {
    const limit = parseInt(process.env.PAID_TIER_LIMIT_PER_MINUTE || '100', 10);

    paidTierLimiterPerMinute = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      prefix: 'ratelimit:paid',
      analytics: true,
    });
  }

  return paidTierLimiterPerMinute;
}

// Admin endpoint rate limiting (for sync-ofac and other admin operations)
let adminLimiter: Ratelimit | null = null;

function getAdminLimiter(): Ratelimit {
  if (!adminLimiter) {
    // Allow 10 admin operations per hour to prevent brute force
    const limit = parseInt(process.env.ADMIN_RATE_LIMIT || '10', 10);

    adminLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(limit, '1 h'),
      prefix: 'ratelimit:admin',
      analytics: true,
    });
  }

  return adminLimiter;
}

export async function checkAdminRateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    const limiter = getAdminLimiter();
    const result = await limiter.limit(identifier);

    logger.debug('Admin rate limit check', {
      identifier,
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
    });

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    logger.error('Admin rate limit check error - FAILING CLOSED for security', {
      identifier,
      error: error instanceof Error ? error.message : String(error)
    });

    // SECURITY: Fail closed for admin endpoints
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 3600000, // Retry in 1 hour
    };
  }
}

export type RateLimitTier = 'free' | 'paid';

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'free'
): Promise<RateLimitResult> {
  try {
    const limiter = tier === 'free' ? getFreeTierLimiter() : getPaidTierLimiter();
    const result = await limiter.limit(identifier);

    logger.debug('Rate limit check', {
      identifier,
      tier,
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
    });

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    logger.error('Rate limit check error - FAILING CLOSED for security', {
      identifier,
      tier,
      error: error instanceof Error ? error.message : String(error)
    });

    // SECURITY FIX: Fail closed to prevent revenue leakage
    // If rate limiting fails, deny the request rather than allowing free access
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000, // Retry in 1 minute
    };
  }
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (Vercel provides this)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}
