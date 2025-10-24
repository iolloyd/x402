import type { NextRequest } from 'next/server';
import { RedisStorage } from '@/lib/cache/redis';
import { checkOFACDataExists } from '@/lib/ofac/checker';
import { HealthCheckResponse } from '@/types/api';
import { Chain } from '@/types/chains';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';
import { validateEnvironment } from '@/utils/config-validator';

export const config = {
  runtime: 'edge',
};

interface DataFreshnessInfo {
  fresh: boolean;
  age_hours: number;
  last_sync: string | null;
  ttl_remaining: number;
}

async function checkDataFreshness(storage: RedisStorage): Promise<DataFreshnessInfo | null> {
  try {
    // Check both chains and use the most recent data
    const chains = [Chain.ETHEREUM, Chain.BASE];
    let mostRecentSync: string | null = null;
    let longestTTL = -2;

    for (const chain of chains) {
      const dataKey = `ofac:${chain}`;
      const timestampKey = `ofac:${chain}:last_sync`;

      // Get TTL for the data key
      const ttl = await storage.ttl(dataKey);
      if (ttl > longestTTL) {
        longestTTL = ttl;
      }

      // Get last sync timestamp
      const lastSync = await storage.get<string>(timestampKey);
      if (lastSync) {
        if (!mostRecentSync || new Date(lastSync) > new Date(mostRecentSync)) {
          mostRecentSync = lastSync;
        }
      }
    }

    // If no data exists, return null
    if (longestTTL === -2 || !mostRecentSync) {
      return null;
    }

    // Calculate age in hours
    const syncTime = new Date(mostRecentSync);
    const now = new Date();
    const ageMs = now.getTime() - syncTime.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Data is fresh if TTL > 1 hour (3600 seconds)
    const fresh = longestTTL > 3600;

    return {
      fresh,
      age_hours: Math.round(ageHours * 100) / 100, // Round to 2 decimal places
      last_sync: mostRecentSync,
      ttl_remaining: longestTTL,
    };
  } catch (error) {
    logger.error('Failed to check data freshness', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function determineHealthStatus(
  redisHealthy: boolean,
  ofacDataHealthy: boolean,
  freshness: DataFreshnessInfo | null
): 'healthy' | 'degraded' | 'unhealthy' {
  // If Redis is down or no OFAC data exists, unhealthy
  if (!redisHealthy || !ofacDataHealthy) {
    return 'unhealthy';
  }

  // If we can't check freshness, consider it degraded
  if (!freshness) {
    return 'degraded';
  }

  // Healthy: data < 24 hours old
  if (freshness.age_hours < 24) {
    return 'healthy';
  }

  // Degraded: data 24-26 hours old
  if (freshness.age_hours <= 26) {
    return 'degraded';
  }

  // Unhealthy: data > 26 hours old
  return 'unhealthy';
}

export default async function handler(req: NextRequest) {
  // Generate correlation ID for request tracking
  const correlationId = getOrCreateCorrelationId(req);

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        correlation_id: correlationId
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...addCorrelationHeaders(correlationId),
        },
      }
    );
  }

  try {
    // Validate environment configuration
    const envValidation = validateEnvironment();
    const configValid = envValidation.status === 'ok';

    const storage = new RedisStorage();

    // Check Redis connection
    const redisHealthy = await storage.ping();

    // Check if OFAC data is loaded for at least one chain
    const ethereumDataExists = await checkOFACDataExists(Chain.ETHEREUM);
    const baseDataExists = await checkOFACDataExists(Chain.BASE);
    const ofacDataHealthy = ethereumDataExists || baseDataExists;

    // Check data freshness
    const freshness = await checkDataFreshness(storage);

    // Determine overall health status (config must be valid for healthy status)
    const baseStatus = determineHealthStatus(redisHealthy, ofacDataHealthy, freshness);
    const status = configValid && baseStatus === 'healthy' ? 'healthy' :
                   configValid ? baseStatus : 'unhealthy';

    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      correlation_id: correlationId,
      checks: {
        redis: redisHealthy,
        ofac_data: ofacDataHealthy,
        config: configValid,
      },
      data_freshness: freshness || undefined,
    };

    // Return 200 for healthy, 503 for degraded or unhealthy
    const httpStatus = status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(response), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        ...addCorrelationHeaders(correlationId),
      },
    });
  } catch (error) {
    logger.error('Health check failed', {
      correlation_id: correlationId,
      error: error instanceof Error ? error.message : String(error)
    });

    const response: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      correlation_id: correlationId,
      checks: {
        redis: false,
        ofac_data: false,
        config: false,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...addCorrelationHeaders(correlationId),
      },
    });
  }
}
