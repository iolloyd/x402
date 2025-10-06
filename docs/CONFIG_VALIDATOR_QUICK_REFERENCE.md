# Config Validator Quick Reference

## Import

```typescript
import {
  validateEnvironment,
  verifyDataSource,
  checkOptionalVariables,
  assertValidEnvironment
} from '@/utils/config-validator';
```

## Functions

### `validateEnvironment()`
```typescript
const result = validateEnvironment();
// Returns: { status: 'ok' | 'error', missing: string[], invalid: string[], production: boolean }
```

### `verifyDataSource(url: string)`
```typescript
const result = verifyDataSource('https://raw.githubusercontent.com/0xB10C/...');
// Returns: { valid: boolean, url?: string, error?: string }
```

### `checkOptionalVariables()`
```typescript
const warnings = checkOptionalVariables();
// Returns: string[] - array of warning messages
```

### `assertValidEnvironment()`
```typescript
assertValidEnvironment(); // Throws error if validation fails
```

## Environment Variables Checked

### Required
- `UPSTASH_REDIS_REST_URL` (HTTPS URL)
- `UPSTASH_REDIS_REST_TOKEN` (string)
- `PAYMENT_RECIPIENT_ADDRESS` (0x + 40 hex chars)
- `NODE_ENV` (string)

### Optional
- `OFAC_SYNC_API_KEY` (recommended for production)

## Common Patterns

### Startup Validation
```typescript
try {
  assertValidEnvironment();
} catch (error) {
  console.error('Config error:', error.message);
  process.exit(1);
}
```

### Health Check
```typescript
const { status } = validateEnvironment();
return { config: status === 'ok' };
```

### Data Source Check
```typescript
const { valid, error } = verifyDataSource(url);
if (!valid) throw new Error(error);
```

## Test Command
```bash
npx tsx scripts/test-config-validator.ts
```

## File Location
`/Users/iolloyd/code/x402/utils/config-validator.ts`

## Edge Runtime
✅ Fully compatible - no external dependencies
