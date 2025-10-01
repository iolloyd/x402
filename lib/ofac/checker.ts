import { SupportedChain } from '@/types/chains';
import { RedisStorage } from '@/lib/cache/redis';
import { OFACCheckResult } from './types';
import * as logger from '@/utils/logger';

export async function isAddressSanctioned(
  chain: SupportedChain,
  address: string
): Promise<OFACCheckResult> {
  const storage = new RedisStorage();
  const key = `ofac:${chain}`;
  const normalized = address.toLowerCase();

  try {
    const isMember = await storage.sismember(key, normalized);

    if (isMember) {
      logger.info('Sanctioned address detected', { chain, address: normalized });

      return {
        sanctioned: true,
        source: 'ofac_github',
        details: {
          list: 'OFAC SDN',
          entity_name: 'Sanctioned Entity',
        },
      };
    }

    return {
      sanctioned: false,
    };
  } catch (error) {
    logger.error('Error checking address against OFAC list', {
      chain,
      address: normalized,
      error: error instanceof Error ? error.message : String(error)
    });

    // In case of error, return false to avoid false positives
    // but log the error for monitoring
    return {
      sanctioned: false,
    };
  }
}

export async function checkOFACDataExists(chain: SupportedChain): Promise<boolean> {
  const storage = new RedisStorage();
  const key = `ofac:${chain}`;

  try {
    return await storage.exists(key);
  } catch (error) {
    logger.error('Error checking if OFAC data exists', {
      chain,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
