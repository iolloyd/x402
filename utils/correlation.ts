/**
 * Correlation ID utilities for request tracking and audit trails
 * Edge Runtime compatible
 */

/**
 * Generate a unique correlation ID for request tracking
 * Format: timestamp-random (e.g., 1696501234567-a1b2c3d4)
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now();
  // Generate 4 random bytes using Web Crypto API (Edge-compatible)
  const buffer = new Uint8Array(4);
  crypto.getRandomValues(buffer);
  const random = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}-${random}`;
}

/**
 * Extract correlation ID from request headers or generate a new one
 */
export function getOrCreateCorrelationId(request: Request): string {
  const existingId = request.headers.get('x-correlation-id') ||
                     request.headers.get('x-request-id');

  return existingId || generateCorrelationId();
}

/**
 * Add correlation ID to response headers
 */
export function addCorrelationHeaders(correlationId: string): Record<string, string> {
  return {
    'X-Correlation-ID': correlationId,
    'X-Request-ID': correlationId, // Alias for compatibility
  };
}
