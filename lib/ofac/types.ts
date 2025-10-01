import { SupportedChain } from '@/types/chains';

export interface OFACDataSource {
  chain: SupportedChain;
  url: string;
}

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
