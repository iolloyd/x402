# OFAC Data Freshness Tracking Implementation

## Summary

Implemented data freshness tracking for OFAC data in the x402 codebase to enable monitoring of when OFAC sanctions lists were last synchronized.

## Changes Made

### 1. Added `ttl()` Method to RedisStorage Class
**File:** `/Users/iolloyd/code/x402/lib/cache/redis.ts`
**Lines:** 133-144

```typescript
async ttl(key: string): Promise<number> {
  try {
    const result = await this.redis.ttl(key);
    return result;
  } catch (error) {
    logger.error('Redis TTL error', {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
    return -2; // Return -2 to indicate key doesn't exist (Redis convention)
  }
}
```

**Signature:** `async ttl(key: string): Promise<number>`
- Returns remaining TTL in seconds
- Returns -2 if key doesn't exist (Redis convention)
- Returns -1 if key exists but has no expiration
- Uses structured error logging

### 2. Modified `storeOFACData()` for Timestamp Tracking
**File:** `/Users/iolloyd/code/x402/lib/cache/redis.ts`
**Lines:** 159-200

Key changes:
- Introduced `timestampKey` variable: `ofac:{chain}:last_sync`
- Stores ISO timestamp when OFAC data is saved
- Timestamp has same TTL as data (90000 seconds / 25 hours)
- Enhanced logging with timestamp information

```typescript
const timestampKey = `ofac:${chain}:last_sync`;

// Store the last sync timestamp
const timestamp = new Date().toISOString();
await storage.set(timestampKey, timestamp, { ttl: 90000 }); // Same TTL as data
```

### 3. Added `getOFACLastSync()` Helper Function
**File:** `/Users/iolloyd/code/x402/lib/cache/redis.ts`
**Lines:** 202-216

```typescript
export async function getOFACLastSync(chain: string): Promise<string | null> {
  const storage = new RedisStorage();
  const timestampKey = `ofac:${chain}:last_sync`;

  try {
    const timestamp = await storage.get<string>(timestampKey);
    return timestamp;
  } catch (error) {
    logger.error('Failed to get OFAC last sync timestamp', {
      chain,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
```

**Signature:** `async getOFACLastSync(chain: string): Promise<string | null>`
- Retrieves last sync timestamp for a specific chain
- Returns ISO timestamp string or null if not found
- Uses structured error logging

### 4. Enhanced Error Logging
**File:** `/Users/iolloyd/code/x402/lib/cache/redis.ts`

Replaced all `console.error()` and `console.log()` calls with structured logging using `@/utils/logger`:
- Import added at line 2: `import * as logger from '@/utils/logger';`
- All Redis operations now use `logger.error()` with contextual metadata
- `storeOFACData()` uses `logger.info()` for successful operations

## Data Flow

### When OFAC Data is Synced

1. **API Call:** `POST /api/data/sync-ofac` or `scripts/seed-redis.ts`
2. **Fetch:** `fetchAllOFACData()` retrieves data from GitHub
3. **Store:** For each chain, `storeOFACData()` is called which:
   - Stores addresses in Redis set: `ofac:{chain}`
   - Stores timestamp in Redis string: `ofac:{chain}:last_sync`
   - Both have 25-hour TTL (90000 seconds)
   - Logs success with timestamp

### When Checking Data Freshness

Use the new helper function:
```typescript
import { getOFACLastSync } from '@/lib/cache/redis';

const lastSync = await getOFACLastSync('ethereum');
if (lastSync) {
  const syncDate = new Date(lastSync);
  console.log(`Last synced: ${syncDate.toLocaleString()}`);
}
```

Or check TTL:
```typescript
import { RedisStorage } from '@/lib/cache/redis';

const storage = new RedisStorage();
const ttl = await storage.ttl('ofac:ethereum:last_sync');
// ttl is remaining seconds, -2 if not exists, -1 if no expiration
```

## Redis Key Schema

| Key Pattern | Type | Purpose | TTL |
|------------|------|---------|-----|
| `ofac:{chain}` | SET | Stores sanctioned addresses | 90000s (25h) |
| `ofac:{chain}:last_sync` | STRING | Stores last sync timestamp (ISO 8601) | 90000s (25h) |

## Edge Runtime Compatibility

All changes maintain Edge runtime compatibility:
- Uses Upstash REST API (already in use)
- No Node.js-specific APIs introduced
- Structured logging compatible with Edge

## Testing

### Manual Testing
```bash
# Sync OFAC data
npx tsx scripts/seed-redis.ts

# Check Redis for timestamp
redis-cli GET ofac:ethereum:last_sync

# Verify TTL
redis-cli TTL ofac:ethereum:last_sync
```

### Programmatic Testing
```typescript
// In a test or API route
import { getOFACLastSync, RedisStorage } from '@/lib/cache/redis';

// Get last sync time
const lastSync = await getOFACLastSync('ethereum');

// Get TTL
const storage = new RedisStorage();
const ttl = await storage.ttl('ofac:ethereum:last_sync');
```

## Files Modified

1. `/Users/iolloyd/code/x402/lib/cache/redis.ts`
   - Added `ttl()` method to RedisStorage class (lines 133-144)
   - Enhanced `storeOFACData()` with timestamp tracking (lines 159-200)
   - Added `getOFACLastSync()` helper function (lines 202-216)
   - Replaced console logging with structured logging throughout

## No Changes Required To

- `/Users/iolloyd/code/x402/lib/ofac/loader.ts` - Already imports and uses `storeOFACData()`
- `/Users/iolloyd/code/x402/scripts/seed-redis.ts` - Already calls `storeOFACData()`
- `/Users/iolloyd/code/x402/pages/api/data/sync-ofac.ts` - Already calls `storeOFACData()`

Timestamp tracking is automatically applied when these existing functions run.

## Benefits

1. **Monitoring:** Can track when OFAC data was last refreshed
2. **Alerting:** Can alert if data becomes stale (e.g., > 24 hours old)
3. **Debugging:** Timestamp in logs helps troubleshoot sync issues
4. **Compliance:** Audit trail of when sanctions data was updated
5. **Health Checks:** Can verify data freshness in health endpoints

## Next Steps

Consider adding:
1. Health check endpoint that verifies OFAC data freshness
2. Alert if data hasn't been synced in > 24 hours
3. Dashboard showing last sync time for all chains
4. Metrics/monitoring for sync frequency
