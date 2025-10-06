/**
 * Script to verify OFAC data freshness tracking
 * Usage: npx tsx scripts/verify-ofac-freshness.ts
 */

import { getOFACLastSync, RedisStorage } from '../lib/cache/redis';
import { SUPPORTED_CHAINS } from '../types/chains';

async function verifyOFACFreshness() {
  console.log('Checking OFAC data freshness...');

  const storage = new RedisStorage();

  for (const chain of SUPPORTED_CHAINS) {
    console.log('\nChain:', chain);
    console.log('='.repeat(50));

    const dataKey = 'ofac:' + chain;
    const dataExists = await storage.exists(dataKey);
    console.log('Data exists:', dataExists);

    if (!dataExists) {
      console.log('No OFAC data found for this chain');
      continue;
    }

    const dataTTL = await storage.ttl(dataKey);
    const dataTTLHours = Math.round(dataTTL / 3600);
    console.log('Data TTL:', dataTTL + 's (' + dataTTLHours + 'h)');

    const lastSync = await getOFACLastSync(chain);
    if (lastSync) {
      const syncDate = new Date(lastSync);
      const now = new Date();
      const ageMs = now.getTime() - syncDate.getTime();
      const ageHours = Math.round(ageMs / (1000 * 60 * 60));

      console.log('Last synced:', syncDate.toISOString());
      console.log('Age:', ageHours + ' hours');
      
      if (ageHours > 24) {
        console.log('WARNING: Data is stale');
      } else {
        console.log('Status: Data is fresh');
      }
    } else {
      console.log('No timestamp found');
    }

    const timestampKey = 'ofac:' + chain + ':last_sync';
    const timestampTTL = await storage.ttl(timestampKey);
    console.log('Timestamp TTL:', timestampTTL + 's');
  }

  console.log('\nVerification complete');
}

verifyOFACFreshness().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
