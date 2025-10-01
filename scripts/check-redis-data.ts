#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
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
  console.log('⚠️  Could not load .env.local');
}

import { Redis } from '@upstash/redis';

async function checkRedisData() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!
  });

  console.log('🔍 Checking Redis OFAC Data\n');

  // Check if keys exist and sample some members
  for (const chain of ['ethereum', 'base']) {
    const key = `ofac:${chain}`;
    console.log(`\nChecking ${key}:`);

    const exists = await redis.exists(key);
    console.log(`  Exists: ${exists === 1 ? 'Yes' : 'No'}`);

    if (exists === 1) {
      // Try to get some random members
      const members = await redis.srandmember(key, 5) as string[];
      console.log(`  Sample addresses (5 random):`);
      if (Array.isArray(members)) {
        members.forEach(m => console.log(`    ${m}`));
      } else if (members) {
        console.log(`    ${members}`);
      } else {
        console.log('    (none found)');
      }

      // Check specific Tornado Cash address
      const tornadoAddress = '0x8589427373D6D84E98730D7795D8f6f8731FDA16';
      const tornadoLower = tornadoAddress.toLowerCase();

      console.log(`\n  Testing Tornado Cash address:`);
      console.log(`    Original: ${tornadoAddress}`);
      console.log(`    Lowercase: ${tornadoLower}`);

      const hasOriginal = await redis.sismember(key, tornadoAddress);
      const hasLower = await redis.sismember(key, tornadoLower);

      console.log(`    Found (original): ${hasOriginal === 1}`);
      console.log(`    Found (lowercase): ${hasLower === 1}`);
    }
  }

  process.exit(0);
}

checkRedisData().catch(console.error);
