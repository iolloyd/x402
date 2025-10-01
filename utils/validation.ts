import { SupportedChain } from '@/types/chains';

export interface AddressValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

export function isValidEthereumAddress(address: string): boolean {
  if (typeof address !== 'string') {
    return false;
  }

  // Check basic format: 0x followed by 40 hex characters
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  return true;
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

const CHAIN_VALIDATORS: Record<SupportedChain, (address: string) => boolean> = {
  ethereum: isValidEthereumAddress,
  base: isValidEthereumAddress, // Base uses same address format as Ethereum
};

export function validateAddress(
  chain: SupportedChain,
  address: string
): AddressValidationResult {
  const validator = CHAIN_VALIDATORS[chain];

  if (!validator) {
    return { valid: false, error: 'Unsupported chain' };
  }

  if (!validator(address)) {
    return { valid: false, error: 'Invalid address format' };
  }

  return { valid: true, normalized: normalizeAddress(address) };
}
