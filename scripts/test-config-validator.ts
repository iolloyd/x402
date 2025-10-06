#!/usr/bin/env tsx
/**
 * Test script for config-validator.ts
 */

import { validateEnvironment, verifyDataSource, checkOptionalVariables } from '../utils/config-validator';
import { OFAC_SOURCES } from '../lib/ofac/types';

console.log('=== Testing config-validator.ts ===\n');

// Test 1: Verify OFAC data sources
console.log('1. Testing verifyDataSource() with OFAC_SOURCES:');
Object.entries(OFAC_SOURCES).forEach(([chain, url]) => {
  const result = verifyDataSource(url);
  console.log(`  Chain: ${chain}`);
  console.log(`  URL: ${url}`);
  console.log(`  Valid: ${result.valid}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  console.log('');
});

// Test 2: Test invalid data sources
console.log('2. Testing verifyDataSource() with invalid URLs:');
const testUrls = [
  'http://raw.githubusercontent.com/0xB10C/test.txt', // HTTP instead of HTTPS
  'https://github.com/0xB10C/test.txt', // Wrong hostname
  'https://raw.githubusercontent.com/someother/test.txt', // Wrong repo
  '', // Empty
];

testUrls.forEach(url => {
  const result = verifyDataSource(url);
  console.log(`  URL: "${url}"`);
  console.log(`  Valid: ${result.valid}`);
  console.log(`  Error: ${result.error || 'N/A'}`);
  console.log('');
});

// Test 3: Environment validation (will depend on actual env vars)
console.log('3. Testing validateEnvironment():');
const envResult = validateEnvironment();
console.log(`  Status: ${envResult.status}`);
console.log(`  Production: ${envResult.production}`);
if (envResult.missing.length > 0) {
  console.log(`  Missing: ${envResult.missing.join(', ')}`);
}
if (envResult.invalid.length > 0) {
  console.log(`  Invalid: ${envResult.invalid.join(', ')}`);
}
console.log('');

// Test 4: Check optional variables
console.log('4. Testing checkOptionalVariables():');
const warnings = checkOptionalVariables();
if (warnings.length > 0) {
  warnings.forEach(w => console.log(`  Warning: ${w}`));
} else {
  console.log('  No warnings');
}
console.log('');

console.log('=== Tests complete ===');
