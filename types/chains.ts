export enum Chain {
  ETHEREUM = 'ethereum',
  BASE = 'base',
}

export const SUPPORTED_CHAINS = [Chain.ETHEREUM, Chain.BASE] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];

export function isValidChain(chain: string): chain is SupportedChain {
  return SUPPORTED_CHAINS.includes(chain as SupportedChain);
}

export function normalizeChain(chain: string): SupportedChain {
  const normalized = chain.toLowerCase();
  if (!isValidChain(normalized)) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return normalized;
}
