#!/usr/bin/env tsx
/**
 * Test script to verify OFAC screening logic
 * Tests Redis data retrieval and screening results
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.log('⚠️  Could not load .env.local, using existing environment variables');
}

import { RedisStorage } from '../lib/cache/redis';
import { isAddressSanctioned } from '../lib/ofac/checker';
import { assessRiskLevel, getRiskFlags } from '../lib/risk/assessor';
import { Chain } from '../types/chains';

async function testScreeningLogic() {
  console.log('🧪 Testing ClearWallet Screening Logic\n');

  const storage = new RedisStorage();

  // Test 1: Check Redis connection
  console.log('Test 1: Redis Connection');
  const isConnected = await storage.ping();
  console.log(`✅ Redis connected: ${isConnected}\n`);

  // Test 2: Check OFAC data exists
  console.log('Test 2: OFAC Data Availability');
  const ethereumExists = await storage.exists('ofac:ethereum');
  const baseExists = await storage.exists('ofac:base');
  console.log(`✅ Ethereum OFAC data: ${ethereumExists}`);
  console.log(`✅ Base OFAC data: ${baseExists}\n`);

  // Test 3: Sample a known sanctioned address (Tornado Cash)
  console.log('Test 3: Screening Known Sanctioned Address');
  const tornadoCashAddress = '0x8589427373D6D84E98730D7795D8f6f8731FDA16';
  const result1 = await isAddressSanctioned(Chain.ETHEREUM, tornadoCashAddress);
  const risk1 = assessRiskLevel({ ofacSanctioned: result1.sanctioned });
  const flags1 = getRiskFlags({ ofacSanctioned: result1.sanctioned });
  console.log(`Address: ${tornadoCashAddress}`);
  console.log(`Sanctioned: ${result1.sanctioned}`);
  console.log(`Risk Level: ${risk1}`);
  console.log(`Flags: ${flags1.join(', ') || 'none'}\n`);

  // Test 4: Test clean address
  console.log('Test 4: Screening Clean Address');
  const cleanAddress = '0x1234567890123456789012345678901234567890';
  const result2 = await isAddressSanctioned(Chain.ETHEREUM, cleanAddress);
  const risk2 = assessRiskLevel({ ofacSanctioned: result2.sanctioned });
  const flags2 = getRiskFlags({ ofacSanctioned: result2.sanctioned });
  console.log(`Address: ${cleanAddress}`);
  console.log(`Sanctioned: ${result2.sanctioned}`);
  console.log(`Risk Level: ${risk2}`);
  console.log(`Flags: ${flags2.join(', ') || 'none'}\n`);

  // Test 5: Check cache is working
  console.log('Test 5: Cache Performance Test');
  const testAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  console.time('First check (no cache)');
  await isAddressSanctioned(Chain.ETHEREUM, testAddress);
  console.timeEnd('First check (no cache)');

  console.time('Second check (cached)');
  const cachedResult = await isAddressSanctioned(Chain.ETHEREUM, testAddress);
  console.timeEnd('Second check (cached)');
  console.log(`Cache hit: ${cachedResult.cache_hit || false}\n`);

  // Test 6: Get sample count of OFAC addresses
  console.log('Test 6: OFAC Data Statistics');
  // Sample check - we can't easily count set members without scanning,
  // but we can verify data exists
  const sampleAddresses = [
    '0x8589427373D6D84E98730D7795D8f6f8731FDA16', // Tornado Cash
    '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    '0xDD4c48C0B24039969fC16D1cdF626eaB821d3384',
  ];

  let foundCount = 0;
  for (const addr of sampleAddresses) {
    const isSanctioned = await storage.sismember('ofac:ethereum', addr.toLowerCase());
    if (isSanctioned) foundCount++;
  }
  console.log(`Found ${foundCount}/${sampleAddresses.length} known sanctioned addresses\n`);

  console.log('✅ All tests completed!\n');

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Redis: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`OFAC Data: ${ethereumExists || baseExists ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`Screening Logic: ${result1.sanctioned ? '✅ Working' : '⚠️  Check data'}`);
  console.log(`Cache: ${cachedResult.cache_hit ? '✅ Working' : '⚠️  No cache yet'}`);

  process.exit(0);
}

// Run tests
testScreeningLogic().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
