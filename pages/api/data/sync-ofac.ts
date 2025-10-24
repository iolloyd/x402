import type { NextRequest } from 'next/server';
import { fetchAllOFACData } from '@/lib/ofac/loader';
import { storeOFACData } from '@/lib/cache/redis';
import { checkAdminRateLimit, getClientIdentifier } from '@/lib/ratelimit/limiter';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  // Generate correlation ID for request tracking
  const correlationId = getOrCreateCorrelationId(req);
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...addCorrelationHeaders(correlationId),
  };

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        correlation_id: correlationId
      }),
      {
        status: 405,
        headers: baseHeaders,
      }
    );
  }

  // SECURITY: Rate limit admin endpoint to prevent brute force attacks
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await checkAdminRateLimit(clientId);

  if (!rateLimitResult.success) {
    logger.warn('Admin endpoint rate limit exceeded', {
      correlation_id: correlationId,
      client_id: clientId,
      reset: new Date(rateLimitResult.reset).toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        correlation_id: correlationId,
        retry_after: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...baseHeaders,
          'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      }
    );
  }

  // Check API key for authorization
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.OFAC_SYNC_API_KEY;

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    logger.warn('Unauthorized sync attempt', {
      correlation_id: correlationId,
      client_id: clientId,
    });

    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        correlation_id: correlationId
      }),
      {
        status: 401,
        headers: baseHeaders,
      }
    );
  }

  try {
    logger.info('Starting OFAC data sync', {
      correlation_id: correlationId,
      client_id: clientId,
    });

    // Fetch all OFAC data
    const dataMap = await fetchAllOFACData();

    // Store in Redis
    for (const [chain, addresses] of dataMap.entries()) {
      await storeOFACData(chain, addresses);
    }

    const totalAddresses = Array.from(dataMap.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    logger.info('OFAC data sync completed', {
      correlation_id: correlationId,
      chains: Array.from(dataMap.keys()),
      totalAddresses
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OFAC data synced successfully',
        chains: Array.from(dataMap.keys()),
        totalAddresses,
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
      }),
      {
        status: 200,
        headers: baseHeaders,
      }
    );
  } catch (error) {
    logger.error('OFAC data sync failed', {
      correlation_id: correlationId,
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to sync OFAC data',
        details: error instanceof Error ? error.message : String(error),
        correlation_id: correlationId,
      }),
      {
        status: 500,
        headers: baseHeaders,
      }
    );
  }
}
