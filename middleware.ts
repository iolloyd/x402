import { paymentMiddleware } from 'x402-next';
import { facilitator } from '@coinbase/x402';

// Environment variables
const PAYMENT_RECIPIENT_ADDRESS = process.env.PAYMENT_RECIPIENT_ADDRESS;
const CDP_CLIENT_KEY = process.env.CDP_CLIENT_KEY;
const PRICE_PER_CHECK = process.env.PRICE_PER_CHECK || '0.005';

if (!PAYMENT_RECIPIENT_ADDRESS) {
  throw new Error('PAYMENT_RECIPIENT_ADDRESS environment variable is required');
}

// Configure the payment middleware
export default paymentMiddleware(
  PAYMENT_RECIPIENT_ADDRESS as `0x${string}`,
  {
    // Wallet screening endpoint
    '/api/screen/:chain/:address': {
      price: `$${PRICE_PER_CHECK}`,
      network: 'base',
      config: {
        discoverable: true,
        description: 'Screen cryptocurrency addresses against OFAC sanctions lists. Returns risk assessment including sanctioned status, risk level, and flags. The endpoint accepts two path parameters: chain (ethereum or base) and address (0x-prefixed hex address).',
        outputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The screened cryptocurrency address',
            },
            chain: {
              type: 'string',
              description: 'The blockchain network',
              enum: ['ethereum', 'base'],
            },
            sanctioned: {
              type: 'boolean',
              description: 'Whether the address is on the OFAC sanctions list',
            },
            risk_level: {
              type: 'string',
              description: 'Risk assessment level',
              enum: ['clear', 'low', 'medium', 'high'],
            },
            flags: {
              type: 'array',
              description: 'List of sanction flags and risk indicators',
              items: {
                type: 'string',
              },
            },
            checked_at: {
              type: 'string',
              description: 'ISO 8601 timestamp when the check was performed',
              format: 'date-time',
            },
            sources: {
              type: 'array',
              description: 'Data sources used for screening',
              items: {
                type: 'string',
              },
            },
            cache_hit: {
              type: 'boolean',
              description: 'Whether the result was served from cache',
            },
            details: {
              type: 'object',
              description: 'Additional details if address is sanctioned',
              properties: {
                list: {
                  type: 'string',
                  description: 'Name of the sanctions list',
                },
                entity_name: {
                  type: 'string',
                  description: 'Name of the sanctioned entity',
                },
                added_date: {
                  type: 'string',
                  description: 'Date when the entity was added to the sanctions list',
                },
              },
            },
          },
          required: [
            'address',
            'chain',
            'sanctioned',
            'risk_level',
            'flags',
            'checked_at',
            'sources',
            'cache_hit',
          ],
        },
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

// Configure matcher to only apply middleware to specific routes
export const config = {
  matcher: ['/api/screen/:path*', '/api/x402/session-token'],
  runtime: 'nodejs', // Temporary until Edge runtime support is added
};
