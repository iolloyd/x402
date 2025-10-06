import { SupportedChain } from '@/types/chains';

export interface OFACDataSource {
  chain: SupportedChain;
  url: string;
}

/**
 * OFAC Data Sources - LIVE PRODUCTION DATA
 *
 * WARNING: These URLs point to LIVE U.S. Treasury OFAC sanctions data maintained by 0xB10C.
 * DO NOT change these URLs to test/mock sources in production environments.
 *
 * Data Source: https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
 * Update Frequency: Daily at 00:00 UTC by 0xB10C
 * Sync Schedule: Our system syncs at 00:05 UTC via GitHub Actions
 *
 * This service relies on accurate, up-to-date OFAC sanctions data for compliance.
 * Using test or mock data in production could result in screening failures and compliance violations.
 */
export const OFAC_SOURCES: Record<SupportedChain, string> = {
  ethereum:
    'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt',
  // Base uses ETH addresses (EVM-compatible)
  base:
    'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt',
};

export interface OFACCheckResult {
  sanctioned: boolean;
  source?: string;
  details?: {
    list: string;
    entity_name?: string;
    added_date?: string;
  };
}
