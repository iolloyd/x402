/**
 * Script to seed Redis with initial OFAC data
 * Run this script after setting up your Upstash Redis instance
 *
 * Usage: npx tsx scripts/seed-redis.ts
 */

import { fetchAllOFACData } from '../lib/ofac/loader';
import { storeOFACData } from '../lib/cache/redis';

async function seedRedis() {
  console.log('Starting Redis seed process...');

  try {
    // Fetch all OFAC data
    console.log('Fetching OFAC data from GitHub...');
    const dataMap = await fetchAllOFACData();

    console.log(`Fetched data for ${dataMap.size} chains`);

    // Store in Redis
    for (const [chain, addresses] of dataMap.entries()) {
      console.log(`Storing ${addresses.size} addresses for chain: ${chain}`);
      await storeOFACData(chain, addresses);
    }

    const totalAddresses = Array.from(dataMap.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    console.log('\n✅ Redis seed completed successfully!');
    console.log(`Total addresses stored: ${totalAddresses}`);
    console.log(`Chains: ${Array.from(dataMap.keys()).join(', ')}`);
  } catch (error) {
    console.error('\n❌ Redis seed failed:', error);
    process.exit(1);
  }
}

seedRedis();
