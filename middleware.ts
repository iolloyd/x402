import { paymentMiddleware } from 'x402-next';
import { facilitator } from '@coinbase/x402';
import type { NextRequest } from 'next/server';

// Environment variables
const PAYMENT_RECIPIENT_ADDRESS = process.env.PAYMENT_RECIPIENT_ADDRESS;
const CDP_CLIENT_KEY = process.env.CDP_CLIENT_KEY;
const PRICE_PER_CHECK = process.env.PRICE_PER_CHECK || '0.005';

if (!PAYMENT_RECIPIENT_ADDRESS) {
  throw new Error('PAYMENT_RECIPIENT_ADDRESS environment variable is required');
}

// Create the payment middleware
const x402Middleware = paymentMiddleware(
  PAYMENT_RECIPIENT_ADDRESS as `0x${string}`,
  {
    // Wallet screening endpoint
    '/api/screen/:chain/:address': {
      price: `$${PRICE_PER_CHECK}`,
      network: 'base',
      config: {
        discoverable: true,
        description: 'Screen cryptocurrency addresses against OFAC sanctions lists. Returns risk assessment including sanctioned status, risk level, and flags. The endpoint accepts two path parameters: chain (ethereum or base) and address (0x-prefixed hex address).',
      },
    },
    // Session token endpoint for Coinbase onramp integration
    '/api/x402/session-token': {
      price: '$0',
      network: 'base',
      config: {
        discoverable: false,
        description: 'Generate session token for Coinbase onramp integration',
      },
    },
  },
  facilitator,
  {
    ...(CDP_CLIENT_KEY && { cdpClientKey: CDP_CLIENT_KEY }),
    sessionTokenEndpoint: '/api/x402/session-token',
  }
);

// Wrapper to conditionally apply middleware based on path
export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Only apply x402 middleware to protected routes
  if (path.startsWith('/api/screen/') || path === '/api/x402/session-token') {
    return x402Middleware(request);
  }

  // Let all other requests pass through
  return undefined;
}

// Configure matcher to only apply middleware to specific routes
export const config = {
  matcher: ['/api/screen/:chain/:address', '/api/x402/session-token'],
  runtime: 'nodejs', // Temporary until Edge runtime support is added
};
