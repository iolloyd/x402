# Environment Configuration Validator

Centralized environment variable validation for the x402 codebase.

## Location

`/Users/iolloyd/code/x402/utils/config-validator.ts`

## Overview

The config validator provides a centralized, Edge runtime-compatible way to validate environment variables and data sources. It follows the same patterns as `logger.ts` and uses no external dependencies.

## Exported Functions

### `validateEnvironment()`

Validates all required environment variables and their formats.

**Returns:** `EnvironmentValidationResult`

```typescript
interface EnvironmentValidationResult {
  status: 'ok' | 'error';
  missing: string[];      // List of missing required variables
  invalid: string[];      // List of invalid formatted variables
  production: boolean;    // True if NODE_ENV === 'production'
}
```

**Required Variables Checked:**
- `UPSTASH_REDIS_REST_URL` - Must be a valid HTTPS URL
- `UPSTASH_REDIS_REST_TOKEN` - Must be present
- `PAYMENT_RECIPIENT_ADDRESS` - Must be valid Ethereum address (0x + 40 hex chars)
- `NODE_ENV` - Must be present

**Example:**

```typescript
import { validateEnvironment } from '@/utils/config-validator';

const result = validateEnvironment();

if (result.status === 'error') {
  console.error('Missing variables:', result.missing);
  console.error('Invalid variables:', result.invalid);
  process.exit(1);
}

console.log('Environment is valid!');
console.log('Production mode:', result.production);
```

### `verifyDataSource(url: string)`

Verifies that a data source URL is valid and points to the expected GitHub repository.

**Parameters:**
- `url` (string): The URL to validate

**Returns:** `DataSourceValidationResult`

```typescript
interface DataSourceValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}
```

**Validation Rules:**
- Must use HTTPS protocol
- Must point to `raw.githubusercontent.com`
- Must point to `0xB10C` repository

**Example:**

```typescript
import { verifyDataSource } from '@/utils/config-validator';
import { OFAC_SOURCES } from '@/lib/ofac/types';

// Verify OFAC data sources
Object.entries(OFAC_SOURCES).forEach(([chain, url]) => {
  const result = verifyDataSource(url);

  if (!result.valid) {
    console.error(`Invalid data source for ${chain}:`, result.error);
  }
});
```

### `checkOptionalVariables()`

Checks for optional but recommended environment variables.

**Returns:** `string[]` - Array of warning messages

**Optional Variables Checked:**
- `OFAC_SYNC_API_KEY` - Recommended for production

**Example:**

```typescript
import { checkOptionalVariables } from '@/utils/config-validator';

const warnings = checkOptionalVariables();

if (warnings.length > 0) {
  warnings.forEach(warning => console.warn(warning));
}
```

### `assertValidEnvironment()`

Performs complete environment validation and throws an error if validation fails. Logs warnings for missing optional variables in production.

**Throws:** `Error` if validation fails

**Example:**

```typescript
import { assertValidEnvironment } from '@/utils/config-validator';

// In your application startup
try {
  assertValidEnvironment();
  console.log('Environment validation passed');
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}
```

## Usage Patterns

### 1. Health Check Integration

Add environment validation to health checks:

```typescript
import { validateEnvironment } from '@/utils/config-validator';

export default async function handler(req: NextRequest) {
  const envValidation = validateEnvironment();
  const configValid = envValidation.status === 'ok';

  const response = {
    status: configValid ? 'healthy' : 'unhealthy',
    checks: {
      config: configValid,
      // ... other checks
    }
  };

  return new Response(JSON.stringify(response));
}
```

### 2. Application Startup

Validate environment on startup:

```typescript
// In your main application file or startup script
import { assertValidEnvironment } from '@/utils/config-validator';

assertValidEnvironment();

// Continue with application initialization
```

### 3. Data Source Validation

Validate OFAC data sources before syncing:

```typescript
import { verifyDataSource } from '@/utils/config-validator';
import { OFAC_SOURCES } from '@/lib/ofac/types';

export async function syncOFACData(chain: string) {
  const url = OFAC_SOURCES[chain];
  const validation = verifyDataSource(url);

  if (!validation.valid) {
    throw new Error(`Invalid OFAC data source: ${validation.error}`);
  }

  // Proceed with sync
}
```

## Edge Runtime Compatibility

The validator is fully compatible with Edge runtime:

- Uses native `URL` class for URL validation
- Uses native `RegExp` for address validation
- No external dependencies
- No Node.js-specific APIs

## Environment Variables

### Required Variables

| Variable | Format | Example |
|----------|--------|---------|
| `UPSTASH_REDIS_REST_URL` | HTTPS URL | `https://your-redis.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | String | `your-token-here` |
| `PAYMENT_RECIPIENT_ADDRESS` | Ethereum Address | `0x1234...5678` (0x + 40 hex) |
| `NODE_ENV` | String | `development` or `production` |

### Optional Variables

| Variable | Purpose |
|----------|---------|
| `OFAC_SYNC_API_KEY` | API key for OFAC data sync endpoint |

## Testing

A test script is available at `/Users/iolloyd/code/x402/scripts/test-config-validator.ts`:

```bash
npx tsx scripts/test-config-validator.ts
```

This will:
1. Validate OFAC data sources
2. Test invalid URL patterns
3. Check current environment configuration
4. Report any warnings

## Implementation Details

### Address Validation

Ethereum addresses are validated using the pattern:
```
^0x[a-fA-F0-9]{40}$
```

This ensures:
- Starts with `0x`
- Followed by exactly 40 hexadecimal characters

### URL Validation

URLs are validated using native `URL` class:
1. Protocol must be HTTPS
2. Hostname must be `raw.githubusercontent.com`
3. Path must start with `/0xB10C/`

### Error Handling

The validator:
- Never throws errors from validation functions (except `assertValidEnvironment`)
- Returns structured results with clear error messages
- Provides both missing and invalid variable lists

## Migration Guide

If you have existing ad-hoc validation:

**Before:**
```typescript
if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('Missing UPSTASH_REDIS_REST_URL');
}
```

**After:**
```typescript
import { validateEnvironment } from '@/utils/config-validator';

const validation = validateEnvironment();
if (validation.status === 'error') {
  throw new Error(`Invalid environment: ${validation.missing.join(', ')}`);
}
```

## Files Updated

The following files have been updated to use the validator:

1. `/Users/iolloyd/code/x402/pages/api/health.ts` - Added config validation to health check
2. `/Users/iolloyd/code/x402/types/api.ts` - Added `config` field to `HealthCheckResponse`

## Related Files

- `/Users/iolloyd/code/x402/utils/logger.ts` - Logging utility (similar pattern)
- `/Users/iolloyd/code/x402/utils/validation.ts` - Address validation utilities
- `/Users/iolloyd/code/x402/lib/ofac/types.ts` - OFAC data source definitions
- `/Users/iolloyd/code/x402/.env.example` - Environment variable examples
