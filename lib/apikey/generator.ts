/**
 * API Key Generation and Validation
 * Edge Runtime compatible
 */

/**
 * Generate a secure API key
 * Format: cw_live_32CharRandomString (total ~43 chars)
 */
export function generateApiKey(): string {
  const prefix = 'cw_live_';
  // Generate 24 random bytes (32 chars in hex)
  const buffer = new Uint8Array(24);
  crypto.getRandomValues(buffer);
  const random = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${prefix}${random}`;
}

/**
 * Generate a unique key ID
 * Format: key_16CharRandomString
 */
export function generateKeyId(): string {
  const prefix = 'key_';
  const buffer = new Uint8Array(12);
  crypto.getRandomValues(buffer);
  const random = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${prefix}${random}`;
}

/**
 * Hash an API key for secure storage
 * Uses Web Crypto API SHA-256
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Should match: cw_live_[48 hex chars]
  return /^cw_live_[0-9a-f]{48}$/.test(apiKey);
}

/**
 * Mask an API key for display
 * Example: cw_live_abc...xyz
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 20) return apiKey;
  const prefix = apiKey.substring(0, 11); // "cw_live_abc"
  const suffix = apiKey.substring(apiKey.length - 3); // "xyz"
  return `${prefix}...${suffix}`;
}
