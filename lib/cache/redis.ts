import { Redis } from '@upstash/redis';

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
      console.error('Redis GET error:', error);
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
      console.error('Redis SET error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      console.error('Redis SADD error:', error);
      throw error;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      console.error('Redis SISMEMBER error:', error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
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

    console.log(`Stored ${addresses.size} OFAC addresses for chain ${chain}`);
  } catch (error) {
    console.error('Failed to store OFAC data:', error);
    throw error;
  }
}
