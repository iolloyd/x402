import { Redis } from '@upstash/redis';
import * as logger from '@/utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing required environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

export interface RedisStorageOptions {
  ttl?: number; // Time to live in seconds
}

export class RedisStorage {
  private redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value as T | null;
    } catch (error) {
      logger.error('Redis GET error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async set(key: string, value: any, options?: RedisStorageOptions): Promise<void> {
    try {
      if (options?.ttl) {
        await this.redis.setex(key, options.ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis DEL error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      if (members.length === 0) return 0;
      // Cast to tuple type to satisfy TypeScript's spread requirements
      return await this.redis.sadd(key, ...(members as [string, ...string[]]));
    } catch (error) {
      logger.error('Redis SADD error', {
        key,
        memberCount: members.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error('Redis SISMEMBER error', {
        key,
        member,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error', {
        key,
        seconds,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

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

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}

export async function storeOFACData(
  chain: string,
  addresses: Set<string>
): Promise<void> {
  const storage = new RedisStorage();
  const key = `ofac:${chain}`;
  const timestampKey = `ofac:${chain}:last_sync`;

  try {
    // Delete existing set if it exists
    await storage.del(key);

    // Add all addresses to the set
    if (addresses.size > 0) {
      const addressArray = Array.from(addresses);
      // Add in batches of 1000 to avoid overloading
      for (let i = 0; i < addressArray.length; i += 1000) {
        const batch = addressArray.slice(i, i + 1000);
        await storage.sadd(key, ...batch);
      }
    }

    // Set expiration for 25 hours (refresh daily)
    await storage.expire(key, 90000); // 25 hours in seconds

    // Store the last sync timestamp
    const timestamp = new Date().toISOString();
    await storage.set(timestampKey, timestamp, { ttl: 90000 }); // Same TTL as data

    logger.info('Stored OFAC addresses', {
      chain,
      addressCount: addresses.size,
      timestamp
    });
  } catch (error) {
    logger.error('Failed to store OFAC data', {
      chain,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

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
