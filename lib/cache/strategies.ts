import { SupportedChain } from '@/types/chains';
import { ScreeningResult } from '@/types/api';
import { RedisStorage } from './redis';
import * as logger from '@/utils/logger';

export class ScreeningCache {
  private storage: RedisStorage;

  constructor() {
    this.storage = new RedisStorage();
  }

  private getCacheKey(chain: SupportedChain, address: string): string {
    return `screen:${chain}:${address.toLowerCase()}`;
  }

  async get(chain: SupportedChain, address: string): Promise<ScreeningResult | null> {
    const key = this.getCacheKey(chain, address);

    try {
      const cached = await this.storage.get<string>(key);

      if (!cached) {
        logger.debug('Cache miss', { chain, address, key });
        return null;
      }

      const result = JSON.parse(cached) as ScreeningResult;
      logger.debug('Cache hit', { chain, address, key });

      return result;
    } catch (error) {
      logger.error('Cache get error', {
        chain,
        address,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async set(
    chain: SupportedChain,
    address: string,
    result: ScreeningResult
  ): Promise<void> {
    const key = this.getCacheKey(chain, address);

    try {
      // Sanctioned addresses: cache for 24 hours (less likely to change)
      // Non-sanctioned addresses: cache for 1 hour
      const ttl = result.sanctioned ? 86400 : 3600;

      await this.storage.set(key, JSON.stringify(result), { ttl });

      logger.debug('Cache set', { chain, address, key, ttl });
    } catch (error) {
      logger.error('Cache set error', {
        chain,
        address,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - caching is not critical
    }
  }

  async delete(chain: SupportedChain, address: string): Promise<void> {
    const key = this.getCacheKey(chain, address);

    try {
      await this.storage.del(key);
      logger.debug('Cache delete', { chain, address, key });
    } catch (error) {
      logger.error('Cache delete error', {
        chain,
        address,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async clear(chain?: SupportedChain): Promise<void> {
    // Note: This is a simplified implementation
    // In production, you'd want to use Redis SCAN to find and delete matching keys
    logger.warn('Cache clear requested', { chain });
    // For MVP, we rely on TTL for cache invalidation
  }
}
