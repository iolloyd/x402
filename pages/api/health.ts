import type { NextRequest } from 'next/server';
import { RedisStorage } from '@/lib/cache/redis';
import { checkOFACDataExists } from '@/lib/ofac/checker';
import { HealthCheckResponse } from '@/types/api';
import { Chain } from '@/types/chains';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const storage = new RedisStorage();

    // Check Redis connection
    const redisHealthy = await storage.ping();

    // Check if OFAC data is loaded for at least one chain
    const ethereumDataExists = await checkOFACDataExists(Chain.ETHEREUM);
    const baseDataExists = await checkOFACDataExists(Chain.BASE);
    const ofacDataHealthy = ethereumDataExists || baseDataExists;

    const allHealthy = redisHealthy && ofacDataHealthy;

    const response: HealthCheckResponse = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        redis: redisHealthy,
        ofac_data: ofacDataHealthy,
      },
    };

    return new Response(JSON.stringify(response), {
      status: allHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        redis: false,
        ofac_data: false,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
