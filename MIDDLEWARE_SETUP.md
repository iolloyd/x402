# X402 Payment Middleware Setup

## Overview
The middleware.ts file has been created at the project root to implement x402 payment middleware for the wallet screening API.

## Configuration Details

### File Location
`/Users/iolloyd/code/x402/middleware.ts`

### Key Features

1. **Payment Middleware Setup**
   - Uses `x402-next` package's `paymentMiddleware` function
   - Uses `@coinbase/x402` facilitator for payment processing
   - Configured for Base mainnet network

2. **Protected Endpoints**

   #### Wallet Screening Endpoint
   - **Route**: `/api/screen/:chain/:address`
   - **Price**: $0.005 (from PRICE_PER_CHECK environment variable)
   - **Network**: Base mainnet
   - **Discoverable**: true (listed in Bazaar)
   - **Description**: "Screen cryptocurrency addresses against OFAC sanctions lists. Returns risk assessment including sanctioned status, risk level, and flags. The endpoint accepts two path parameters: chain (ethereum or base) and address (0x-prefixed hex address)."
   - **Output Schema**: Fully defined ScreeningResponse structure including:
     - address, chain, sanctioned, risk_level
     - flags, checked_at, sources, cache_hit
     - details (optional, for sanctioned addresses)

   #### Session Token Endpoint
   - **Route**: `/api/x402/session-token`
   - **Price**: $0 (free)
   - **Network**: Base mainnet
   - **Discoverable**: false
   - **Purpose**: Generate session tokens for Coinbase onramp integration

3. **Environment Variables Used**
   - `PAYMENT_RECIPIENT_ADDRESS` (required): Wallet address to receive payments
   - `CDP_CLIENT_KEY` (optional): Coinbase Developer Platform client key for onramp
   - `PRICE_PER_CHECK` (optional): Price per screening check (defaults to 0.005)

4. **Configuration**
   - **Matcher**: `['/api/screen/:path*', '/api/x402/session-token']`
   - **Runtime**: `nodejs` (temporary until Edge runtime support is added)
   - **Facilitator**: Uses Coinbase x402 facilitator
   - **Paywall**: Configured with CDP client key and session token endpoint

## How It Works

1. **Request Interception**: The middleware intercepts requests to the configured routes
2. **Payment Verification**: Checks for valid x402 payment headers
3. **Payment Processing**: Uses the facilitator to verify and settle payments
4. **Request Forwarding**: If payment is valid, forwards request to the API handler
5. **Paywall Display**: If no payment, displays payment UI with onramp integration

## Integration with Existing API

The middleware wraps the existing screening API at `/pages/api/screen/[chain]/[address].ts`. The API handler remains unchanged and continues to:
- Validate chain and address parameters
- Check rate limits
- Validate x402 payment headers (now verified by middleware)
- Perform OFAC screening
- Return screening results

## Next Steps

1. **Testing**: Test the middleware with the development server
2. **Onramp Setup**: Configure CDP_CLIENT_KEY for onramp functionality
3. **Bazaar Listing**: The endpoint is now discoverable for AI agents via Bazaar
4. **Edge Runtime**: When available, update runtime config from 'nodejs' to 'edge'

## Notes

- The middleware is configured for Base mainnet but can be easily switched to base-sepolia for testing
- Path parameters (chain and address) are automatically extracted from the URL pattern
- The facilitator handles all payment verification and settlement logic
- The paywall configuration enables users to purchase USDC via Coinbase onramp if needed
