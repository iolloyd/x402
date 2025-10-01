import type { NextRequest } from 'next/server';
import { fetchAllOFACData } from '@/lib/ofac/loader';
import { storeOFACData } from '@/lib/cache/redis';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check API key for authorization
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.OFAC_SYNC_API_KEY;

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    logger.info('Starting OFAC data sync');

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
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('OFAC data sync failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to sync OFAC data',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
