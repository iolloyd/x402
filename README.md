# ClearWallet

Agent-optimized API for screening cryptocurrency addresses against OFAC sanctions lists. Built with Next.js, Vercel Edge Functions, and Upstash Redis for sub-second response times.

## Features

### Core Screening
- Has sub-second response times via Vercel Edge Functions
- Real-time OFAC sanctions screening
- Support for Ethereum and Base chains
- Multi-layer caching strategy (Redis)
- Daily automated OFAC data updates
- Request correlation IDs for audit trails

### Enterprise Features (Phase 2 ✅)
- **API Key Management**: Complete CRUD system with custom rate limits
- **Batch Screening**: Process up to 1,000 addresses per request
- **Multi-Tier Support**: Free, Starter, Pro, Enterprise tiers
- **Usage Tracking**: Per-key analytics and monitoring
- **Flexible Authentication**: API keys, Bearer tokens, or X402 payments

### Enterprise Ready (Phase 3 ✅)
- **OpenAPI 3.0 Specification**: Complete API documentation with Swagger UI
- **Interactive API Docs**: Test endpoints directly in browser at `/docs`
- **Stripe Billing Integration**: Automated subscription management
- **Self-Service Dashboard**: Customer portal for key and usage management
- **Webhook Handlers**: Automated billing lifecycle management
- **SDK Generation**: Auto-generate clients for 50+ languages

### Payment Integration
- X402 payment protocol integration with Coinbase facilitator
- Stripe subscriptions ($99-2999/month)
- AI agent discoverable via X402 Bazaar
- Coinbase onramp integration for seamless payment
- Per-request or subscription billing

## Tech Stack

- **Runtime**: Next.js 14+ with TypeScript
- **Platform**: Vercel (Edge Functions)
- **Caching**: Upstash Redis
- **Rate Limiting**: @upstash/ratelimit
- **Payments**: X402 protocol with x402-next middleware and Coinbase facilitator
- **Onramp**: Coinbase Developer Platform
- **Data Source**: 0xB10C OFAC GitHub Repository

## Project Structure

```
x402/
├── middleware.ts                 # X402 payment middleware
├── lib/
│   ├── cache/
│   │   ├── redis.ts              # Redis client and storage
│   │   └── strategies.ts         # Cache-aside pattern
│   ├── ofac/
│   │   ├── checker.ts            # OFAC address checking
│   │   ├── loader.ts             # OFAC data fetching
│   │   └── types.ts              # OFAC types
│   ├── ratelimit/
│   │   └── limiter.ts            # Rate limiting logic
│   ├── risk/
│   │   └── assessor.ts           # Risk assessment
│   └── x402/
│       ├── types.ts              # X402 types
│       └── validator.ts          # Payment validation
├── pages/api/
│   ├── data/
│   │   └── sync-ofac.ts          # OFAC data sync endpoint
│   ├── health.ts                 # Health check
│   ├── screen/
│   │   └── [chain]/
│   │       └── [address].ts      # Main screening endpoint
│   └── x402/
│       └── session-token.ts      # CDP session token endpoint
├── types/
│   ├── api.ts                    # API types
│   └── chains.ts                 # Chain types
├── utils/
│   ├── errors.ts                 # Error handling
│   ├── logger.ts                 # Structured logging
│   └── validation.ts             # Address validation
└── scripts/
    └── seed-redis.ts             # Redis initialization
```

## Setup

### Prerequisites

- Node.js 20.x or higher
- Upstash Redis account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
cd /Users/iolloyd/code/x402
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```bash
# Required
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Required for X402 payments
PAYMENT_RECIPIENT_ADDRESS=0x...

# Optional (Coinbase Developer Platform for onramp)
CDP_CLIENT_KEY=your-cdp-client-key
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret

# Optional (X402 configuration)
PAYMENT_VERIFICATION_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY
PRICE_PER_CHECK=0.005

# Optional (for data sync)
OFAC_SYNC_API_KEY=your-secret-key-here
```

### Initialize OFAC Data

Before running the API, seed Redis with OFAC data:

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the seed script
npx tsx scripts/seed-redis.ts
```

This will:
- Fetch OFAC sanctioned addresses from GitHub
- Store them in Redis
- Set up proper TTL for automatic expiration

## Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Test the API

1. Health check:
```bash
curl http://localhost:3000/api/health
```

2. Screen an address (will return 402 Payment Required):
```bash
curl http://localhost:3000/api/screen/ethereum/0x1234567890123456789012345678901234567890
```

3. Manually sync OFAC data:
```bash
curl -X POST http://localhost:3000/api/data/sync-ofac \
  -H "Authorization: Bearer your-secret-key"
```

## API Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "redis": true,
    "ofac_data": true
  }
}
```

### GET /api/screen/{chain}/{address}

Screen a cryptocurrency address against OFAC sanctions.

**Parameters:**
- `chain`: `ethereum` or `base`
- `address`: Cryptocurrency address to screen

**Headers:**
- `X-PAYMENT`: (Optional) X402 payment payload

**Response (Success - Not Sanctioned):**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "chain": "ethereum",
  "sanctioned": false,
  "risk_level": "clear",
  "flags": [],
  "checked_at": "2025-10-01T10:30:00Z",
  "sources": ["ofac_github"],
  "cache_hit": false
}
```

**Response (Sanctioned):**
```json
{
  "address": "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
  "chain": "ethereum",
  "sanctioned": true,
  "risk_level": "high",
  "flags": ["ofac_sdn_list"],
  "checked_at": "2025-10-01T10:30:00Z",
  "sources": ["ofac_github"],
  "details": {
    "list": "OFAC SDN",
    "entity_name": "Sanctioned Entity"
  },
  "cache_hit": false
}
```

**Response (Payment Required):**
```json
{
  "error": "Payment required",
  "code": "PAYMENT_REQUIRED",
  "payment_details": {
    "paymentRequirements": [{
      "scheme": "x402-stablecoin",
      "amount": "0.005",
      "currency": "USDC",
      "network": "base",
      "recipient": "0x...",
      "metadata": {
        "service": "wallet-screening",
        "version": "v1"
      }
    }]
  }
}
```

### POST /api/data/sync-ofac

Manually trigger OFAC data synchronization.

**Headers:**
- `Authorization`: Bearer token (set in `OFAC_SYNC_API_KEY`)

**Response:**
```json
{
  "success": true,
  "message": "OFAC data synced successfully",
  "chains": ["ethereum", "base"],
  "totalAddresses": 500,
  "timestamp": "2025-10-01T10:30:00Z"
}
```

## Rate Limiting

### Free Tier (No Payment)
- 10 requests per day per IP
- Returns 402 Payment Required

### Paid Tier (With X402 Payment)
- 100 requests per minute
- 10,000 requests per day

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-10-01T11:00:00Z
```

## Caching Strategy

### Layer 1: OFAC Dataset Cache
- Stores complete OFAC list in Redis SET
- TTL: 25 hours
- Updated daily via automated job
- Key format: `ofac:{chain}`

### Layer 2: Screening Results Cache
- Stores individual screening results
- TTL: 1 hour (non-sanctioned), 24 hours (sanctioned)
- Key format: `screen:{chain}:{address}`

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.example`

4. Set up GitHub Actions secrets:
   - `VERCEL_API_URL`: Your deployed API URL
   - `OFAC_SYNC_API_KEY`: Secret key for data sync

### Configure Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy REST URL and token to environment variables
3. Run the seed script to populate initial data

### Automated OFAC Updates

The GitHub Actions workflow runs daily at 00:05 UTC to sync OFAC data:
- Location: `.github/workflows/update-ofac-data.yml`
- Triggers: Daily schedule or manual dispatch
- Requires: `VERCEL_API_URL` and `OFAC_SYNC_API_KEY` secrets

## Environment Variables

### Required

- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST API token
- `PAYMENT_RECIPIENT_ADDRESS`: Address to receive X402 payments (required for payment middleware)

### Optional - Coinbase Developer Platform

- `CDP_CLIENT_KEY`: Coinbase Developer Platform client key for onramp integration
- `CDP_API_KEY_ID`: CDP API key ID for session token generation
- `CDP_API_KEY_SECRET`: CDP API key secret for session token generation

### Optional - X402 Configuration

- `PAYMENT_VERIFICATION_RPC`: RPC URL for payment verification
- `PRICE_PER_CHECK`: Price per screening check in USD (default: 0.005)

### Optional - Rate Limiting

- `SUPPORTED_CHAINS`: Comma-separated list of chains (default: ethereum,base)
- `FREE_TIER_LIMIT`: Free tier daily limit (default: 10)
- `PAID_TIER_LIMIT_PER_MINUTE`: Paid tier per-minute limit (default: 100)
- `PAID_TIER_LIMIT_PER_DAY`: Paid tier daily limit (default: 10000)

### Optional - Data Sync

- `OFAC_SYNC_API_KEY`: Secret key for OFAC sync endpoint
- `NODE_ENV`: Environment (development/production)

## Performance

- **Response Time**: < 200ms (p95) with cache hit
- **Cache Hit Rate**: > 80% expected
- **Uptime**: > 99.5% (Vercel SLA)
- **Cold Start**: < 100ms (Edge Functions)

## Error Codes

- `INVALID_ADDRESS`: Invalid address format
- `UNSUPPORTED_CHAIN`: Chain not supported
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `PAYMENT_REQUIRED`: Payment required
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_ERROR`: Internal server error

## Data Sources

- **Primary**: [0xB10C OFAC GitHub](https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses)
  - Updates: Daily at 0 UTC
  - Format: TXT (one address per line)
  - Cost: FREE

### Data Freshness Guarantee

The ClearWallet service maintains strict data freshness guarantees to ensure reliable OFAC sanctions screening:

- **Live Data Source**: Uses production OFAC data from the 0xB10C GitHub repository, which is updated daily at 00:00 UTC with official U.S. Treasury OFAC sanctions data
- **Automated Sync**: GitHub Actions workflow automatically syncs data at 00:05 UTC daily
- **Buffer Period**: 25-hour Redis TTL provides a 1-hour buffer beyond the 24-hour update cycle
- **Health Monitoring**: Built-in health checks continuously monitor data age and freshness
- **Status Levels**:
  - **Healthy**: Data is less than 24 hours old
  - **Degraded**: Data is between 24-26 hours old (service continues but logs warnings)
  - **Unhealthy**: Data is more than 26 hours old (indicates sync failure requiring investigation)

### Monitoring

The service provides comprehensive monitoring capabilities to ensure data freshness and service reliability:

- **Health Check Endpoint**: `GET /api/health`
  - Returns service status, data freshness metrics, and last sync timestamp
  - Includes Redis connectivity check and OFAC data availability check
  - Provides data age in milliseconds for precise monitoring
  - Can be integrated with uptime monitoring tools (UptimeRobot, Pingdom, etc.)

**Example Health Check Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-05T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "redis": true,
    "ofac_data": true
  },
  "ofac_data_age_ms": 18000000,
  "ofac_data_last_sync": "2025-10-05T05:30:00Z"
}
```

**Health Check Status Indicators:**
- `status: "healthy"` - All systems operational, data is fresh
- `status: "degraded"` - Service operational but data is approaching staleness threshold
- `status: "unhealthy"` - Data sync has failed, immediate attention required

## Security

- Input validation on all requests
- Rate limiting to prevent abuse
- Payment validation for paid tier
- Secure Redis connections (TLS)
- No PII storage

## X402 Payment Integration

The X402 payment integration is now COMPLETE. The service uses the x402-next payment middleware with Coinbase facilitator to enable seamless micropayments for API access.

### How It Works

The payment middleware intercepts requests to protected endpoints and:
1. Checks for valid X402 payment headers
2. Verifies payment using the Coinbase facilitator on Base mainnet
3. Processes payment settlement automatically
4. Forwards authenticated requests to the API handler
5. Displays a payment UI with Coinbase onramp for unpaid requests

### Configuration

Set up your X402 payment integration by configuring these environment variables:

1. **Required**: `PAYMENT_RECIPIENT_ADDRESS` - Your wallet address to receive payments
2. **Optional**: `CDP_CLIENT_KEY`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` - Coinbase Developer Platform credentials for onramp functionality
3. **Optional**: `PRICE_PER_CHECK` - Price per screening check (default: $0.005)

For detailed middleware setup instructions, see [MIDDLEWARE_SETUP.md](MIDDLEWARE_SETUP.md).

### Protected Endpoints

The following endpoints are protected by X402 payment middleware:

- `/api/screen/:chain/:address` - Wallet screening endpoint ($0.005 per check)
- `/api/x402/session-token` - Session token generation (free, for onramp integration)

### X402 Bazaar Listing

The wallet screening service is discoverable by AI agents through the X402 Bazaar. AI agents can:
- Discover the service and its capabilities automatically
- View the structured API schema including input parameters and output format
- Make payments and access the API programmatically
- Receive detailed screening responses with sanctioned status and risk assessment

The service metadata includes:
- Full endpoint description and usage instructions
- Input schema (chain and address parameters)
- Output schema (screening response structure)
- Pricing information ($0.005 per check)
- Network information (Base mainnet)

### Coinbase Onramp Integration

Users without USDC can seamlessly purchase it through the integrated Coinbase onramp:
- Automatic paywall display for unpaid requests
- One-click purchase flow
- Supports credit/debit cards and bank transfers
- Instant USDC delivery on Base network

## Future Enhancements

- Add more blockchain networks (Solana, Polygon, Arbitrum)
- Implement batch screening endpoint
- Add webhook notifications for newly sanctioned addresses
- Enhanced risk scoring with transaction history
- API key management dashboard
- Additional data sources (Chainalysis, TRM Labs)
- Migration to Edge runtime for payment middleware

