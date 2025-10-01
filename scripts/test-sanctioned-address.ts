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
} catch (error) {}

import { isAddressSanctioned } from '../lib/ofac/checker';
import { assessRiskLevel, getRiskFlags } from '../lib/risk/assessor';
import { Chain } from '../types/chains';

async function testAddresses() {
  console.log('🧪 Testing ClearWallet with Real Sanctioned Addresses\n');

  // Test with actual addresses from Redis
  const testCases = [
    { address: '0x0ee5067b06776a89ccc7dc8ee369984ad7db5e06', expected: true, label: 'Known Sanctioned #1' },
    { address: '0x3cffd56b47b7b41c56258d9c7731abadc360e073', expected: true, label: 'Known Sanctioned #2' },
    { address: '0x1234567890123456789012345678901234567890', expected: false, label: 'Clean Address' },
    { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', expected: false, label: 'Vitalik.eth' },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.label}`);
    console.log(`Address: ${testCase.address}`);

    const result = await isAddressSanctioned(Chain.ETHEREUM, testCase.address);
    const riskLevel = assessRiskLevel({ ofacSanctioned: result.sanctioned });
    const flags = getRiskFlags({ ofacSanctioned: result.sanctioned });

    const status = result.sanctioned === testCase.expected ? '✅' : '❌';
    console.log(`${status} Sanctioned: ${result.sanctioned} (expected: ${testCase.expected})`);
    console.log(`  Risk Level: ${riskLevel}`);
    console.log(`  Flags: ${flags.join(', ') || 'none'}`);
    console.log(`  Cache Hit: ${result.cache_hit || false}`);
    console.log(`  Sources: ${result.sources ? result.sources.join(', ') : 'ofac_github'}\n`);
  }

  console.log('✅ Screening logic test complete!');
  process.exit(0);
}

testAddresses().catch(console.error);
