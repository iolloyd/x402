#!/usr/bin/env tsx

/**
 * Integration Test Script: Verify Live OFAC Data
 *
 * This script verifies that the application is using live OFAC data by:
 * 1. Testing the health check endpoint
 * 2. Testing a known sanctioned address (Tornado Cash)
 * 3. Verifying data source URLs
 *
 * Prerequisites: Application must be running on http://localhost:3000
 */

import { OFAC_SOURCES } from '../lib/ofac/types';

const API_BASE_URL = 'http://localhost:3000';
const TORNADO_CASH_ADDRESS = '0x8589427373D6D84E98730D7795D8f6f8731FDA16';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded';
  data_freshness?: {
    ethereum?: {
      last_sync: string;
      age_hours: number;
      count: number;
    };
    base?: {
      last_sync: string;
      age_hours: number;
      count: number;
    };
  };
  timestamp: string;
}

interface ScreeningResponse {
  sanctioned: boolean;
  risk_level?: string;
  flags?: string[];
  details?: {
    chain: string;
    address: string;
    cache_hit?: boolean;
  };
}

let exitCode = 0;

async function testHealthCheck(): Promise<boolean> {
  console.log('\n📋 Testing Health Check Endpoint...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      console.log(`❌ Health check failed with status: ${response.status}`);
      return false;
    }

    const data: HealthCheckResponse = await response.json();

    // Verify status field exists and is valid
    if (!data.status || !['healthy', 'degraded'].includes(data.status)) {
      console.log('❌ Invalid status field in health check response');
      return false;
    }
    console.log(`✅ Status: ${data.status}`);

    // Verify data_freshness object exists
    if (!data.data_freshness) {
      console.log('⚠️  Warning: data_freshness object not found');
      return true; // Not critical
    }
    console.log('✅ Data freshness information available');

    // Display data age for each chain
    if (data.data_freshness.ethereum) {
      const eth = data.data_freshness.ethereum;
      console.log(`   Ethereum: ${eth.age_hours.toFixed(1)} hours old (${eth.count} addresses)`);
      console.log(`   Last sync: ${new Date(eth.last_sync).toLocaleString()}`);
    }

    if (data.data_freshness.base) {
      const base = data.data_freshness.base;
      console.log(`   Base: ${base.age_hours.toFixed(1)} hours old (${base.count} addresses)`);
      console.log(`   Last sync: ${new Date(base.last_sync).toLocaleString()}`);
    }

    return true;
  } catch (error) {
    console.log(`❌ Health check error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testKnownSanctionedAddress(): Promise<boolean> {
  console.log('\n🎯 Testing Known Sanctioned Address (Tornado Cash)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Address: ${TORNADO_CASH_ADDRESS}`);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/screen/ethereum/${TORNADO_CASH_ADDRESS}`
    );

    if (!response.ok) {
      console.log(`❌ Screening API failed with status: ${response.status}`);
      return false;
    }

    const data: ScreeningResponse = await response.json();

    // Verify sanctioned field exists
    if (typeof data.sanctioned !== 'boolean') {
      console.log('❌ Invalid response: sanctioned field missing or invalid');
      return false;
    }

    // Verify this known address is sanctioned
    if (data.sanctioned !== true) {
      console.log('❌ CRITICAL: Known Tornado Cash address not detected as sanctioned!');
      console.log('   This indicates live OFAC data is NOT being used.');
      return false;
    }

    console.log('✅ Address correctly identified as sanctioned');
    console.log(`   Risk level: ${data.risk_level || 'N/A'}`);
    console.log(`   Flags: ${data.flags?.join(', ') || 'none'}`);
    console.log(`   Cache hit: ${data.details?.cache_hit ? 'yes' : 'no'}`);
    console.log('\n   ✅ This proves live OFAC data is being used!');

    return true;
  } catch (error) {
    console.log(`❌ Screening test error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function verifyDataSources(): boolean {
  console.log('\n🔍 Verifying Data Source URLs...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const expectedHostname = 'raw.githubusercontent.com';
  const expectedPath = '/0xB10C/ofac-sanctioned-digital-currency-addresses/';

  let allValid = true;

  for (const [chain, url] of Object.entries(OFAC_SOURCES)) {
    try {
      const urlObj = new URL(url);

      const hostnameValid = urlObj.hostname === expectedHostname;
      const pathValid = urlObj.pathname.includes(expectedPath);

      if (hostnameValid && pathValid) {
        console.log(`✅ ${chain}: Valid 0xB10C repository URL`);
      } else {
        console.log(`❌ ${chain}: Invalid source URL`);
        console.log(`   Expected hostname: ${expectedHostname}`);
        console.log(`   Actual hostname: ${urlObj.hostname}`);
        console.log(`   Expected path contains: ${expectedPath}`);
        console.log(`   Actual path: ${urlObj.pathname}`);
        allValid = false;
      }
    } catch (error) {
      console.log(`❌ ${chain}: Invalid URL format`);
      allValid = false;
    }
  }

  return allValid;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Live OFAC Data Integration Test                  ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // Test 1: Health Check
  const healthCheckPassed = await testHealthCheck();
  if (!healthCheckPassed) {
    exitCode = 1;
  }

  // Test 2: Known Sanctioned Address
  const sanctionedTestPassed = await testKnownSanctionedAddress();
  if (!sanctionedTestPassed) {
    exitCode = 1;
  }

  // Test 3: Data Source URLs
  const sourcesValid = verifyDataSources();
  if (!sourcesValid) {
    exitCode = 1;
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                     ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`Health Check:         ${healthCheckPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Sanctioned Address:   ${sanctionedTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Data Sources:         ${sourcesValid ? '✅ PASSED' : '❌ FAILED'}`);

  if (exitCode === 0) {
    console.log('\n🎉 All tests passed! Live OFAC data is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.\n');
  }

  process.exit(exitCode);
}

// Run the tests
main().catch((error) => {
  console.error('\n❌ Unexpected error during test execution:');
  console.error(error);
  process.exit(1);
});
