# ClearWallet

ClearWallet is an agent-optimized OFAC (Office of Foreign Assets Control) sanctions screening API for cryptocurrency addresses. It enables real-time compliance checking against U.S. Treasury sanctions lists, designed for both AI agents (via X402 micropayments) and enterprise compliance teams (via API keys and subscriptions).

## What It Does

ClearWallet screens blockchain addresses to determine whether they appear on OFAC sanctions lists. When you submit an address, the service:

1. Validates the address format and chain
2. Checks authentication (API key, X402 payment, or free tier)
3. Looks up the address against cached OFAC data
4. Returns a risk assessment with sanctions status

The service maintains fresh OFAC data through daily automated syncs from the official [0xB10C OFAC GitHub repository](https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses), which sources directly from U.S. Treasury sanctions lists.

## How It Works

### Architecture Overview

```
Request Flow:

Client Request
     |
[Middleware] -----> X402 Payment Validation
     |              Supabase Auth Routing
     v
[API Handler] ----> Address & Chain Validation
     |              Authentication Check (API Key / X402 / Free)
     |              Rate Limit Check
     v
[Business Logic] -> Redis Cache Lookup
     |              OFAC Set Membership Check
     |              Risk Assessment
     v
[Response] -------> JSON with sanctions status, risk level, flags
```

### Data Flow

1. **Daily OFAC Sync**: GitHub Actions fetches sanctioned addresses at 00:05 UTC
2. **Redis Storage**: Addresses stored as SET for O(1) membership lookups
3. **Cache Strategy**:
   - OFAC dataset: 25-hour TTL (1-hour buffer beyond daily updates)
   - Sanctioned results: 24-hour TTL
   - Clear results: 1-hour TTL
4. **Response**: Sub-200ms with cache hit, includes correlation ID for audit trails

### Authentication Methods

| Method | Use Case | Rate Limits |
|--------|----------|-------------|
| **Free (IP-based)** | Testing/evaluation | 10 requests/day per IP |
| **X402 Payment** | AI agents, micropayments | 100 req/min, 10K req/day |
| **API Key** | Enterprise integration | Custom per-key limits |
| **Subscription** | High-volume usage | Tier-based (Starter/Pro/Enterprise) |

## Features

### Core Screening
- Real-time OFAC sanctions screening
- Sub-second response times via Vercel Edge Functions
- Support for Ethereum and Base chains
- Multi-layer Redis caching
- Request correlation IDs for audit trails
- Daily automated OFAC data updates

### Enterprise Features
- **API Key Management**: Full CRUD with custom rate limits
- **Batch Screening**: Process up to 1,000 addresses per request
- **Multi-Tier Support**: Free, Starter ($99/mo), Pro ($499/mo), Enterprise ($2,999/mo)
- **Usage Analytics**: Per-key tracking and monitoring
- **Self-Service Dashboard**: Manage keys, view usage, billing portal

### Payment Integration
- **X402 Protocol**: Micropayments ($0.005/check) via Coinbase facilitator
- **Stripe Subscriptions**: Monthly billing with customer portal
- **Coinbase Onramp**: Seamless USDC purchase for X402 payments
- **AI Agent Discovery**: Listed on X402 Bazaar for autonomous agents

### Developer Experience
- **OpenAPI 3.0 Specification**: Complete API documentation
- **Interactive Docs**: Test endpoints at `/docs`
- **SDK Generation**: Auto-generate clients for 50+ languages

## Tech Stack

- **Runtime**: Next.js 14+ with TypeScript
- **Platform**: Vercel Edge Functions
- **Database**: Supabase (PostgreSQL)
- **Caching**: Upstash Redis
- **Rate Limiting**: @upstash/ratelimit
- **Authentication**: Supabase Auth + API Keys
- **Payments**: X402 protocol (x402-next middleware) + Stripe
- **Onramp**: Coinbase Developer Platform
- **Data Source**: 0xB10C OFAC GitHub Repository

## Project Structure

```
x402/
├── middleware.ts                 # X402 payment & auth routing
├── lib/
│   ├── apikey/
│   │   ├── generator.ts          # API key generation
│   │   └── storage.ts            # API key storage & validation
│   ├── billing/
│   │   └── stripe.ts             # Stripe integration
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
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── middleware.ts         # Auth middleware
│   │   └── server.ts             # Server client
│   └── x402/
│       ├── types.ts              # X402 types
│       └── validator.ts          # Payment validation
├── pages/
│   ├── api/
│   │   ├── billing/
│   │   │   ├── portal.ts         # Stripe customer portal
│   │   │   └── webhook.ts        # Stripe webhooks
│   │   ├── data/
│   │   │   └── sync-ofac.ts      # OFAC data sync endpoint
│   │   ├── keys/
│   │   │   ├── index.ts          # List/create API keys
│   │   │   └── [keyId].ts        # Get/delete individual key
│   │   ├── screen/
│   │   │   ├── batch.ts          # Batch screening
│   │   │   └── [chain]/
│   │   │       └── [address].ts  # Main screening endpoint
│   │   ├── health.ts             # Health check
│   │   └── x402/
│   │       └── session-token.ts  # CDP session token endpoint
│   ├── _app.tsx                  # App wrapper with Supabase context
│   ├── dashboard.tsx             # User dashboard (protected)
│   ├── docs.tsx                  # Interactive API documentation
│   ├── index.tsx                 # Landing page
│   ├── login.tsx                 # Authentication
│   └── signup.tsx                # Registration
├── public/
│   └── .well-known/
│       └── x402.json             # X402 discovery metadata
├── types/
│   ├── api.ts                    # API types
│   └── chains.ts                 # Chain types
├── utils/
│   ├── errors.ts                 # Error handling
│   ├── logger.ts                 # Structured logging
│   └── validation.ts             # Address validation
├── scripts/
│   └── seed-redis.ts             # Redis initialization
└── .github/
    └── workflows/
        └── update-ofac-data.yml  # Daily OFAC sync
```

## Setup

### Prerequisites

- Node.js 20.x or higher
- Upstash Redis account
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd x402
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure `.env.local`:
```bash
# Required - Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for X402 payments
PAYMENT_RECIPIENT_ADDRESS=0x...

# Optional - Coinbase Developer Platform
CDP_CLIENT_KEY=your-cdp-client-key
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret

# Optional - Stripe billing
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Optional - Configuration
PRICE_PER_CHECK=0.005
PAYMENT_VERIFICATION_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY
OFAC_SYNC_API_KEY=your-secret-key-here
```

### Initialize OFAC Data

Before running the API, seed Redis with OFAC data:

```bash
npx tsx scripts/seed-redis.ts
```

This fetches OFAC sanctioned addresses from GitHub and stores them in Redis.

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

2. Screen an address (free tier):
```bash
curl http://localhost:3000/api/screen/ethereum/0x1234567890123456789012345678901234567890
```

3. Screen with API key:
```bash
curl http://localhost:3000/api/screen/ethereum/0x1234567890123456789012345678901234567890 \
  -H "x-api-key: your-api-key"
```

4. Batch screening:
```bash
curl -X POST http://localhost:3000/api/screen/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"addresses": [{"chain": "ethereum", "address": "0x..."}]}'
```

## API Endpoints

### GET /api/health

Health check with data freshness metrics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "redis": true,
    "ofac_data": true
  },
  "ofac_data_age_ms": 18000000,
  "ofac_data_last_sync": "2025-10-01T05:30:00Z"
}
```

Status values: `healthy` (data < 24h), `degraded` (24-26h), `unhealthy` (> 26h)

### GET /api/screen/{chain}/{address}

Screen a single address against OFAC sanctions.

**Parameters:**
- `chain`: `ethereum` or `base`
- `address`: 0x-prefixed 40-character hex address

**Headers:**
- `x-api-key` or `Authorization: Bearer <key>`: API key authentication
- `X-Payment`: X402 payment proof
- `X-Correlation-ID`: Optional request correlation ID

**Response (Not Sanctioned):**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "chain": "ethereum",
  "sanctioned": false,
  "risk_level": "clear",
  "flags": [],
  "checked_at": "2025-10-01T10:30:00Z",
  "sources": ["ofac_github"],
  "cache_hit": false,
  "correlation_id": "abc123"
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
  "cache_hit": false
}
```

### POST /api/screen/batch

Screen multiple addresses in a single request (up to 1,000).

**Request:**
```json
{
  "addresses": [
    {"chain": "ethereum", "address": "0x..."},
    {"chain": "base", "address": "0x..."}
  ]
}
```

**Response:**
```json
{
  "results": [
    {"address": "0x...", "chain": "ethereum", "sanctioned": false, ...},
    {"address": "0x...", "chain": "base", "sanctioned": false, ...}
  ],
  "summary": {
    "total": 2,
    "sanctioned": 0,
    "clear": 2
  }
}
```

### API Key Management

#### GET /api/keys
List all API keys for authenticated user.

#### POST /api/keys
Create a new API key.

#### GET /api/keys/{keyId}
Get details for a specific key.

#### DELETE /api/keys/{keyId}
Revoke an API key.

### POST /api/data/sync-ofac

Manually trigger OFAC data synchronization.

**Headers:**
- `Authorization: Bearer <OFAC_SYNC_API_KEY>`

## Rate Limiting

| Tier | Per Minute | Per Day | Notes |
|------|------------|---------|-------|
| Free | N/A | 10 | IP-based |
| X402 Payment | 100 | 10,000 | Per-payment |
| API Key | Custom | Custom | Configurable per key |

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-10-01T11:00:00Z
```

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

3. Configure environment variables in Vercel dashboard

4. Set up GitHub Actions secrets for automated OFAC sync:
   - `VERCEL_API_URL`: Your deployed API URL
   - `OFAC_SYNC_API_KEY`: Secret key for data sync

### Configure External Services

**Upstash Redis:**
1. Create database at [upstash.com](https://upstash.com)
2. Copy REST URL and token to environment variables

**Supabase:**
1. Create project at [supabase.com](https://supabase.com)
2. Set up users table and RLS policies
3. Copy project URL and keys to environment variables

**Stripe (optional):**
1. Create account at [stripe.com](https://stripe.com)
2. Configure subscription products and prices
3. Set up webhook endpoint: `https://your-domain/api/billing/webhook`

## Data Freshness

ClearWallet maintains strict data freshness guarantees:

- **Source**: Official OFAC data via 0xB10C GitHub repository
- **Update Frequency**: Daily at 00:05 UTC
- **Redis TTL**: 25 hours (1-hour buffer beyond 24-hour cycle)
- **Monitoring**: `/api/health` reports data age and sync status

Status levels:
- **Healthy**: Data < 24 hours old
- **Degraded**: Data 24-26 hours old (service continues with warnings)
- **Unhealthy**: Data > 26 hours old (sync failure requiring investigation)

## Security

- Address validation: Strict 0x-prefixed 40-character hex format
- Rate limiting: Fails closed (denies requests if Redis unavailable)
- Payment validation: Cryptographic proof via X402 protocol
- Redis: TLS connections via Upstash
- No PII storage: Only addresses screened, no personal data
- Correlation IDs: Full audit trail capability

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ADDRESS` | Address format validation failed |
| `UNSUPPORTED_CHAIN` | Chain not in supported list |
| `RATE_LIMIT_EXCEEDED` | Rate limit reached |
| `PAYMENT_REQUIRED` | X402 payment needed (402 status) |
| `UNAUTHORIZED` | Invalid or missing API key |
| `SERVICE_UNAVAILABLE` | Temporary service issue |
| `INTERNAL_ERROR` | Server error |

## Performance

- **Response Time**: < 50ms cache hit, < 200ms p95 overall
- **Cache Hit Rate**: > 80% expected
- **Cold Start**: < 100ms (Vercel Edge Functions)
- **Uptime**: > 99.5% (Vercel + Upstash SLA)

## X402 Integration

ClearWallet is discoverable by AI agents through the X402 Bazaar. The service metadata at `/.well-known/x402.json` includes:

- Endpoint descriptions and capabilities
- Input/output schemas
- Pricing ($0.005 USDC per check on Base network)
- Payment recipient address

AI agents can autonomously discover, pay for, and use the screening service for compliance workflows.

## Future Enhancements

- Additional blockchain networks (Solana, Polygon, Arbitrum)
- Webhook notifications for newly sanctioned addresses
- Enhanced risk scoring with transaction history analysis
- Additional data sources (Chainalysis, TRM Labs)
- Edge runtime migration for payment middleware
