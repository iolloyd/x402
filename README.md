# X402 Wallet Screening API

Agent-optimized API for screening cryptocurrency addresses against OFAC sanctions lists. Built with Next.js, Vercel Edge Functions, and Upstash Redis for sub-second response times.

## Features

- Sub-second response times via Vercel Edge Functions
- Real-time OFAC sanctions screening
- Support for Ethereum and Base chains
- Multi-layer caching strategy (Redis)
- Rate limiting (free and paid tiers)
- X402 payment integration
- Daily automated OFAC data updates

## Tech Stack

- **Runtime**: Next.js 14+ with TypeScript
- **Platform**: Vercel (Edge Functions)
- **Caching**: Upstash Redis
- **Rate Limiting**: @upstash/ratelimit
- **Data Source**: 0xB10C OFAC GitHub Repository

## Project Structure

```
x402/
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
│   └── screen/
│       └── [chain]/
│           └── [address].ts      # Main screening endpoint
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

# Optional (for X402 payments)
PAYMENT_RECIPIENT_ADDRESS=0x...
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

### Optional

- `PAYMENT_RECIPIENT_ADDRESS`: Address to receive X402 payments
- `PAYMENT_VERIFICATION_RPC`: RPC URL for payment verification
- `PRICE_PER_CHECK`: Price per screening check (default: 0.005)
- `SUPPORTED_CHAINS`: Comma-separated list of chains (default: ethereum,base)
- `FREE_TIER_LIMIT`: Free tier daily limit (default: 10)
- `PAID_TIER_LIMIT_PER_MINUTE`: Paid tier per-minute limit (default: 100)
- `PAID_TIER_LIMIT_PER_DAY`: Paid tier daily limit (default: 10000)
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

## Security

- Input validation on all requests
- Rate limiting to prevent abuse
- Payment validation for paid tier
- Secure Redis connections (TLS)
- No PII storage

## Next Steps

### Phase 3: X402 Payment Integration (Not Yet Implemented)

The current implementation includes payment validation stubs. To complete X402 integration:

1. Implement on-chain payment verification in `lib/x402/validator.ts`
2. Add payment proof verification logic
3. Integrate with X402 payment SDK
4. Test with X402 test environment
5. Submit to X402 Bazaar

### Future Enhancements

- Add more blockchain networks (Solana, Polygon, Arbitrum)
- Implement batch screening endpoint
- Add webhook notifications for newly sanctioned addresses
- Enhanced risk scoring with transaction history
- API key management dashboard
- Additional data sources (Chainalysis, TRM Labs)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
