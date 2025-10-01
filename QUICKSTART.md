# X402 Wallet Screening API - Quick Start Guide

Get your OFAC wallet screening API up and running in 5 minutes.

## Prerequisites

- Node.js 20.x or higher
- An Upstash Redis account (free tier available)
- Git

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Create a new Redis database
3. Copy the REST URL and REST TOKEN from the dashboard

## Step 3: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Upstash credentials:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## Step 4: Initialize OFAC Data

Load the OFAC sanctioned addresses into Redis:

```bash
npx tsx scripts/seed-redis.ts
```

This will fetch and store sanctioned addresses for Ethereum and Base chains.

## Step 5: Start the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Step 6: Test the API

### Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
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

### Screen an Address (Free Tier)

```bash
curl http://localhost:3000/api/screen/ethereum/0x1234567890123456789012345678901234567890
```

Expected response (402 Payment Required):
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
      "recipient": "0x0000000000000000000000000000000000000000",
      "metadata": {
        "service": "wallet-screening",
        "version": "v1"
      }
    }]
  }
}
```

### Test with Known Sanctioned Address

Test with a Tornado Cash address (known OFAC sanctioned):

```bash
curl "http://localhost:3000/api/screen/ethereum/0x8589427373D6D84E98730D7795D8f6f8731FDA16"
```

## Deploy to Vercel

### Quick Deploy

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to link your project

4. Set environment variables in Vercel:
```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

5. Redeploy:
```bash
vercel --prod
```

### Set Up Automated OFAC Updates

1. Go to your GitHub repository settings
2. Add these secrets:
   - `VERCEL_API_URL`: Your deployed API URL (e.g., https://your-app.vercel.app)
   - `OFAC_SYNC_API_KEY`: A random secret key for the sync endpoint

3. Update `.env.local` on Vercel:
```bash
vercel env add OFAC_SYNC_API_KEY
```

The GitHub Action will now run daily at 00:05 UTC to sync OFAC data.

## Next Steps

1. **Configure X402 Payments**:
   - Set `PAYMENT_RECIPIENT_ADDRESS` in environment variables
   - Implement on-chain payment verification in `lib/x402/validator.ts`

2. **Monitor Performance**:
   - Check Vercel Analytics dashboard
   - Monitor Redis usage in Upstash console

3. **Customize Rate Limits**:
   - Adjust `FREE_TIER_LIMIT` and `PAID_TIER_LIMIT_PER_MINUTE` as needed

4. **Add More Chains**:
   - Extend `types/chains.ts` with new chains
   - Add chain-specific OFAC sources in `lib/ofac/types.ts`

## Troubleshooting

### Redis Connection Error

If you see "Missing Redis configuration":
- Verify `.env.local` has correct `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Restart the dev server after changing environment variables

### No OFAC Data

If health check shows `ofac_data: false`:
- Run the seed script: `npx tsx scripts/seed-redis.ts`
- Check Redis dashboard to verify data is stored

### Rate Limiting Issues

Free tier is limited to 10 requests per day per IP. To test more:
- Implement X402 payment validation
- Or temporarily increase `FREE_TIER_LIMIT` in `.env.local`

## API Documentation

See [README.md](./README.md) for complete API documentation.

## Support

For issues and questions, check the main README or open a GitHub issue.
