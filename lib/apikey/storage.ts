/**
 * API Key Storage Operations
 * Manages API keys in Redis
 */

import { Redis } from '@upstash/redis';
import { ApiKey, ApiKeyWithSecret, CreateApiKeyRequest, TIER_LIMITS } from '@/types/apikey';
import { generateApiKey, generateKeyId, hashApiKey } from './generator';
import * as logger from '@/utils/logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('Missing Redis configuration');
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

/**
 * Create a new API key
 */
export async function createApiKey(
  request: CreateApiKeyRequest
): Promise<ApiKeyWithSecret> {
  const keyId = generateKeyId();
  const apiKey = generateApiKey();
  const hashedKey = await hashApiKey(apiKey);
  const now = new Date().toISOString();

  const tier = request.tier || 'free';
  const defaultLimits = TIER_LIMITS[tier];

  const apiKeyData: ApiKey = {
    key_id: keyId,
    customer_id: request.customer_id,
    name: request.name,
    tier,
    created_at: now,
    last_used_at: null,
    usage_count: 0,
    is_active: true,
    rate_limits: request.rate_limits || {
      requests_per_minute: defaultLimits.rpm,
      requests_per_day: defaultLimits.rpd,
    },
    metadata: request.metadata || {},
  };

  const client = getRedis();

  try {
    // Store key metadata
    await client.hset(`apikey:${keyId}`, apiKeyData as any);

    // Store hashed key for lookup
    await client.set(`apikey:lookup:${hashedKey}`, keyId);

    // Add to customer's key set
    await client.sadd(`customer:${request.customer_id}:keys`, keyId);

    logger.info('API key created', {
      key_id: keyId,
      customer_id: request.customer_id,
      tier,
    });

    return {
      ...apiKeyData,
      api_key: apiKey, // Only returned once
    };
  } catch (error) {
    logger.error('Failed to create API key', {
      customer_id: request.customer_id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to create API key');
  }
}

/**
 * Get API key by ID
 */
export async function getApiKey(keyId: string): Promise<ApiKey | null> {
  const client = getRedis();

  try {
    const data = await client.hgetall(`apikey:${keyId}`);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return data as unknown as ApiKey;
  } catch (error) {
    logger.error('Failed to get API key', {
      key_id: keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Lookup API key by the actual key value
 */
export async function lookupApiKey(apiKey: string): Promise<ApiKey | null> {
  const client = getRedis();

  try {
    const hashedKey = await hashApiKey(apiKey);
    const keyId = await client.get<string>(`apikey:lookup:${hashedKey}`);

    if (!keyId) {
      return null;
    }

    return getApiKey(keyId);
  } catch (error) {
    logger.error('Failed to lookup API key', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * List all API keys for a customer
 */
export async function listApiKeys(customerId: string): Promise<ApiKey[]> {
  const client = getRedis();

  try {
    const keyIds = await client.smembers(`customer:${customerId}:keys`);

    if (!keyIds || keyIds.length === 0) {
      return [];
    }

    const keys = await Promise.all(
      keyIds.map(keyId => getApiKey(keyId))
    );

    return keys.filter((key): key is ApiKey => key !== null);
  } catch (error) {
    logger.error('Failed to list API keys', {
      customer_id: customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  const client = getRedis();

  try {
    const key = await getApiKey(keyId);
    if (!key) {
      return false;
    }

    // Mark as inactive
    await client.hset(`apikey:${keyId}`, { is_active: false });

    logger.info('API key revoked', { key_id: keyId });
    return true;
  } catch (error) {
    logger.error('Failed to revoke API key', {
      key_id: keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string): Promise<boolean> {
  const client = getRedis();

  try {
    const key = await getApiKey(keyId);
    if (!key) {
      return false;
    }

    // Get the hashed key for lookup deletion
    // Note: We can't easily reverse the hash, so we'll just delete the key data
    // The lookup entry will remain but won't find a valid key

    // Delete key metadata
    await client.del(`apikey:${keyId}`);

    // Remove from customer's key set
    await client.srem(`customer:${key.customer_id}:keys`, keyId);

    logger.info('API key deleted', { key_id: keyId });
    return true;
  } catch (error) {
    logger.error('Failed to delete API key', {
      key_id: keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Update API key usage stats
 */
export async function updateApiKeyUsage(keyId: string): Promise<void> {
  const client = getRedis();

  try {
    const now = new Date().toISOString();

    await client.hincrby(`apikey:${keyId}`, 'usage_count', 1);
    await client.hset(`apikey:${keyId}`, { last_used_at: now });
  } catch (error) {
    logger.error('Failed to update API key usage', {
      key_id: keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - usage tracking failure shouldn't break the request
  }
}

/**
 * Update API key tier
 */
export async function updateApiKeyTier(
  keyId: string,
  tier: string,
  customLimits?: { requests_per_minute?: number; requests_per_day?: number }
): Promise<boolean> {
  const client = getRedis();

  try {
    const key = await getApiKey(keyId);
    if (!key) {
      return false;
    }

    const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    const finalLimits = customLimits || {
      requests_per_minute: tierLimits.rpm,
      requests_per_day: tierLimits.rpd,
    };

    await client.hset(`apikey:${keyId}`, {
      tier,
      rate_limits: JSON.stringify({
        requests_per_minute: finalLimits.requests_per_minute,
        requests_per_day: finalLimits.requests_per_day,
      }),
    });

    logger.info('API key tier updated', { key_id: keyId, tier });
    return true;
  } catch (error) {
    logger.error('Failed to update API key tier', {
      key_id: keyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
