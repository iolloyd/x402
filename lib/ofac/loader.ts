import { SupportedChain } from '@/types/chains';
import { OFAC_SOURCES } from './types';
import * as logger from '@/utils/logger';

export async function fetchOFACAddresses(chain: SupportedChain): Promise<Set<string>> {
  const url = OFAC_SOURCES[chain];

  if (!url) {
    throw new Error(`No OFAC source configured for chain: ${chain}`);
  }

  try {
    logger.info('Fetching OFAC addresses', { chain, url });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch OFAC data: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    const addresses = text
      .split('\n')
      .map((addr) => addr.trim().toLowerCase())
      .filter((addr) => addr.length > 0 && addr.startsWith('0x'));

    logger.info('Successfully fetched OFAC addresses', {
      chain,
      count: addresses.length
    });

    return new Set(addresses);
  } catch (error) {
    logger.error('Failed to fetch OFAC addresses', {
      chain,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function fetchAllOFACData(): Promise<Map<SupportedChain, Set<string>>> {
  const chains: SupportedChain[] = ['ethereum', 'base'];
  const dataMap = new Map<SupportedChain, Set<string>>();

  for (const chain of chains) {
    try {
      const addresses = await fetchOFACAddresses(chain);
      dataMap.set(chain, addresses);
    } catch (error) {
      logger.error('Failed to fetch OFAC data for chain', {
        chain,
        error: error instanceof Error ? error.message : String(error)
      });
      // Set empty set on error to prevent complete failure
      dataMap.set(chain, new Set());
    }
  }

  return dataMap;
}
