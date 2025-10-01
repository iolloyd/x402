# X402 Wallet Screening API - Production Deployment Guide

This guide provides step-by-step instructions for deploying the x402 wallet screening API to production and getting it listed on the x402 Bazaar for AI agent discovery.

## Table of Contents

1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Account Setup](#account-setup)
3. [Coinbase Developer Platform Configuration](#coinbase-developer-platform-configuration)
4. [Upstash Redis Setup](#upstash-redis-setup)
5. [Environment Configuration](#environment-configuration)
6. [Data Initialization](#data-initialization)
7. [Vercel Deployment](#vercel-deployment)
8. [X402 Bazaar Listing](#x402-bazaar-listing)
9. [Testing the X402 Payment Flow](#testing-the-x402-payment-flow)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Production Readiness Checklist](#production-readiness-checklist)
12. [Troubleshooting](#troubleshooting)

---

## Pre-deployment Checklist

Before you begin deployment, ensure you have:

- [ ] Node.js 20.x or higher installed
- [ ] Git repository access
- [ ] A wallet address to receive USDC payments (Ethereum/Base compatible)
- [ ] Access to create accounts on:
  - Upstash (Redis database)
  - Vercel (deployment platform)
  - Coinbase Developer Platform (payment processing and onramp)
- [ ] Basic familiarity with environment variables and API keys
- [ ] Test the application locally first (`npm run dev`)

**Estimated Setup Time**: 45-60 minutes

---

## Account Setup

### 1. Upstash Account

**Purpose**: Provides Redis database for caching OFAC data and screening results.

**Steps**:
1. Go to https://upstash.com
2. Click "Sign Up" and create an account (GitHub login recommended)
3. Verify your email address
4. You'll get a free tier with sufficient capacity for starting

### 2. Vercel Account

**Purpose**: Hosts the Next.js application with Edge Functions for low-latency API responses.

**Steps**:
1. Go to https://vercel.com
2. Click "Sign Up" and connect your GitHub account
3. Grant Vercel access to your repository
4. You'll get generous free tier limits

### 3. Coinbase Developer Platform Account

**Purpose**: Provides payment facilitation and onramp services for USDC payments.

**Steps**:
1. Go to https://portal.cdp.coinbase.com
2. Click "Get started" or "Sign in"
3. Complete the registration process
4. Verify your email and complete any required KYC steps
5. Navigate to the developer portal dashboard

---

## Coinbase Developer Platform Configuration

### Overview

The CDP integration enables two critical features:
1. **Payment Facilitation**: Verifies and settles X402 USDC payments on Base network
2. **Onramp Integration**: Allows users to purchase USDC with credit/debit cards

### Step 1: Create API Keys

API keys are required for payment verification and session token generation.

1. **Navigate to API Keys**:
   - Log in to https://portal.cdp.coinbase.com
   - Click on "API Keys" in the left sidebar
   - Click "Create API Key"

2. **Configure API Key**:
   - Name: `x402-wallet-screening-production`
   - Permissions: Select the following:
     - `wallet:read` (for payment verification)
     - `wallet:transactions:read` (for transaction validation)
   - Click "Create"

3. **Save Your Credentials**:
   ```
   CDP_API_KEY_ID=organizations/{org-id}/apiKeys/{key-id}
   CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----
   [Your private key will be displayed here]
   -----END EC PRIVATE KEY-----
   ```

   **IMPORTANT**:
   - The private key is only shown ONCE
   - Copy it immediately to a secure location
   - Never commit these credentials to version control

### Step 2: Get Client Key for Onramp

The client key enables the Coinbase onramp widget in the payment UI.

1. **Navigate to Onramp Settings**:
   - In the CDP portal, go to "Onramp" or "Products"
   - Click "Create Onramp Integration"

2. **Configure Onramp**:
   - Application Name: `X402 Wallet Screening`
   - Destination Network: `Base`
   - Default Asset: `USDC`
   - Redirect URL: Your production domain (e.g., `https://wallet-screening.x402.org`)

3. **Copy Client Key**:
   ```
   CDP_CLIENT_KEY=your-client-key-here
   ```

### Step 3: Configure Payment Recipient Address

This is YOUR wallet address where you'll receive USDC payments.

**Requirements**:
- Must be a valid Ethereum/Base address (0x-prefixed)
- Must be accessible on Base mainnet
- Recommended: Use a hardware wallet or secure custodial service
- Can be the same address on both networks (Ethereum addresses work on Base)

**Example**:
```
PAYMENT_RECIPIENT_ADDRESS=0x1234567890123456789012345678901234567890
```

**Where to Get an Address**:
- Coinbase Wallet: https://www.coinbase.com/wallet
- MetaMask: https://metamask.io
- Hardware wallet: Ledger or Trezor

**Important Considerations**:
- This address will receive all USDC payments from API users
- Ensure you have secure access to this wallet
- Consider using a multi-sig wallet for additional security
- Test with a small amount first before going live

---

## Upstash Redis Setup

### Step 1: Create Redis Database

1. **Log in to Upstash**:
   - Go to https://console.upstash.com
   - Click "Create Database"

2. **Configure Database**:
   - Name: `x402-wallet-screening-prod`
   - Type: `Regional` (cheaper) or `Global` (lower latency worldwide)
   - Region: Choose closest to your Vercel deployment region
   - Eviction: `noeviction` (important for data integrity)
   - TLS: `Enabled` (required)

3. **Create Database**:
   - Click "Create"
   - Wait for provisioning (usually < 30 seconds)

### Step 2: Get Connection Credentials

1. **Navigate to Database Details**:
   - Click on your newly created database
   - Scroll to "REST API" section

2. **Copy Credentials**:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXj...your-token-here
   ```

3. **Test Connection** (optional):
   ```bash
   curl https://your-redis-instance.upstash.io/get/test \
     -H "Authorization: Bearer AXj...your-token-here"
   ```

### Step 3: Configure Redis for Production

**Memory Settings**:
- Minimum: 256 MB (handles ~100K addresses)
- Recommended: 512 MB (handles ~500K addresses with room for growth)
- The free tier (256 MB) is sufficient for initial deployment

**TTL Configuration**:
The application automatically sets appropriate TTLs:
- OFAC dataset: 25 hours (refreshed daily)
- Screening results (clean): 1 hour
- Screening results (sanctioned): 24 hours

---

## Environment Configuration

### Required Environment Variables

Create these environment variables in Vercel (see Vercel Deployment section for where to add them):

```bash
# Redis Configuration (REQUIRED)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Payment Configuration (REQUIRED)
PAYMENT_RECIPIENT_ADDRESS=0x1234567890123456789012345678901234567890

# Coinbase Developer Platform (REQUIRED for production)
CDP_CLIENT_KEY=your-cdp-client-key
CDP_API_KEY_ID=organizations/{org-id}/apiKeys/{key-id}
CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----
[Your multi-line private key]
-----END EC PRIVATE KEY-----
```

### Optional Environment Variables

```bash
# Payment Configuration
PAYMENT_VERIFICATION_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY
PRICE_PER_CHECK=0.005

# API Configuration
SUPPORTED_CHAINS=ethereum,base

# Rate Limiting
FREE_TIER_LIMIT=10
PAID_TIER_LIMIT_PER_MINUTE=100
PAID_TIER_LIMIT_PER_DAY=10000

# Data Sync
OFAC_SYNC_API_KEY=your-secret-key-for-data-sync

# Environment
NODE_ENV=production
```

### Environment Variable Notes

**CDP_API_KEY_SECRET**:
- This is a multi-line PEM format private key
- In Vercel, paste the entire key including the BEGIN/END lines
- Do not add quotes or escape characters
- Vercel will handle multi-line values correctly

**OFAC_SYNC_API_KEY**:
- Generate a secure random string: `openssl rand -base64 32`
- Used to protect the data sync endpoint
- Will be needed for GitHub Actions setup

**PAYMENT_VERIFICATION_RPC**:
- Optional: Custom RPC endpoint for payment verification
- If not provided, uses default public RPCs
- For production, recommended to use Alchemy or Infura for reliability
- Get Alchemy API key at: https://www.alchemy.com/

---

## Data Initialization

Before your API can screen addresses, you need to populate Redis with OFAC sanctioned address data.

### Option 1: Local Initialization (Recommended)

**Best for**: Initial setup, testing data flow

1. **Install Dependencies**:
   ```bash
   cd /Users/iolloyd/code/x402
   npm install
   ```

2. **Configure Local Environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Upstash credentials
   ```

3. **Run Seed Script**:
   ```bash
   npx tsx scripts/seed-redis.ts
   ```

4. **Expected Output**:
   ```
   Starting Redis seed process...
   Fetching OFAC data from GitHub...
   Fetched data for 2 chains
   Storing 450 addresses for chain: ethereum
   Storing 450 addresses for chain: base

   ✅ Redis seed completed successfully!
   Total addresses stored: 900
   Chains: ethereum, base
   ```

5. **Verify Data**:
   ```bash
   # Test with a known sanctioned address
   curl http://localhost:3000/api/screen/ethereum/0x8589427373D6D84E98730D7795D8f6f8731FDA16
   ```

### Option 2: Remote Initialization via API

**Best for**: Re-syncing data, scheduled updates

1. **Wait for Vercel Deployment** (complete Vercel Deployment section first)

2. **Trigger Sync Endpoint**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/data/sync-ofac \
     -H "Authorization: Bearer YOUR_OFAC_SYNC_API_KEY" \
     -H "Content-Type: application/json"
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "message": "OFAC data synced successfully",
     "chains": ["ethereum", "base"],
     "totalAddresses": 900,
     "timestamp": "2025-10-01T10:30:00Z"
   }
   ```

### Data Sources

The application fetches data from:
- **Source**: 0xB10C OFAC GitHub Repository
- **URL**: https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
- **Format**: Plain text files, one address per line
- **Update Frequency**: Daily at 00:00 UTC
- **Cost**: Free (public GitHub repository)

---

## Vercel Deployment

### Step 1: Connect Repository to Vercel

1. **Log in to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "Add New" → "Project"

2. **Import Repository**:
   - Select your GitHub account
   - Find the `x402` repository
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Step 2: Configure Environment Variables

1. **Navigate to Environment Variables**:
   - In project settings, click "Environment Variables"

2. **Add All Required Variables**:

   Click "Add" for each variable:

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `UPSTASH_REDIS_REST_URL` | `https://your-redis.upstash.io` | Production, Preview, Development |
   | `UPSTASH_REDIS_REST_TOKEN` | `your-token-here` | Production, Preview, Development |
   | `PAYMENT_RECIPIENT_ADDRESS` | `0x...` | Production, Preview, Development |
   | `CDP_CLIENT_KEY` | `your-client-key` | Production, Preview, Development |
   | `CDP_API_KEY_ID` | `organizations/{org}/apiKeys/{key}` | Production, Preview, Development |
   | `CDP_API_KEY_SECRET` | Multi-line PEM key | Production, Preview, Development |
   | `OFAC_SYNC_API_KEY` | `your-secret-key` | Production, Preview, Development |
   | `NODE_ENV` | `production` | Production only |

3. **Multi-line Variables**:
   - For `CDP_API_KEY_SECRET`, paste the entire PEM key including BEGIN/END lines
   - Vercel handles multi-line values automatically
   - No need to escape or add quotes

### Step 3: Configure Build Settings

**Vercel automatically detects Next.js**, but verify these settings:

1. **General Settings**:
   - Node.js Version: `20.x` (recommended)
   - Framework: Next.js

2. **Build & Development Settings**:
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Development Command: npm run dev
   ```

3. **Function Configuration**:
   - Region: Choose closest to your target users
   - Function Duration: 10s (default, sufficient for API)

### Step 4: Deploy

1. **Initial Deployment**:
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Vercel will show build logs in real-time

2. **Monitor Deployment**:
   - Watch for any build errors
   - Common issues:
     - Missing environment variables
     - Type errors (should be caught in local dev)
     - Build timeout (increase if needed)

3. **Deployment Success**:
   - You'll get a production URL: `https://your-app.vercel.app`
   - Vercel automatically provisions SSL certificate
   - Edge Functions are deployed globally

### Step 5: Configure Custom Domain (Optional)

1. **Add Domain**:
   - In project settings, go to "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `wallet-screening.x402.org`)

2. **Configure DNS**:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or use Vercel nameservers for full management

3. **Verify Domain**:
   - Wait for DNS propagation (5-60 minutes)
   - Vercel automatically provisions SSL certificate
   - Your API will be available at your custom domain

### Step 6: Test Deployment

1. **Health Check**:
   ```bash
   curl https://your-app.vercel.app/api/health
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

2. **Test Screening Endpoint** (will return 402 Payment Required):
   ```bash
   curl https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890
   ```

   Expected response:
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

### Step 7: Configure GitHub Actions Secrets

For automated OFAC data updates:

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository
   - Click "Settings" → "Secrets and variables" → "Actions"

2. **Add Secrets**:
   - Click "New repository secret"

   Add these secrets:
   - Name: `VERCEL_API_URL`
     Value: `https://your-app.vercel.app` (or custom domain)

   - Name: `OFAC_SYNC_API_KEY`
     Value: Same value you used in Vercel environment variables

3. **Verify Workflow**:
   - The workflow is in `.github/workflows/update-ofac-data.yml`
   - Runs daily at 00:05 UTC
   - Can be manually triggered from Actions tab

---

## X402 Bazaar Listing

### How Bazaar Discovery Works

The x402 Bazaar is a decentralized directory that AI agents use to discover available x402 services. Your API is automatically discoverable through the x402 middleware configuration.

### What Makes Your Service Discoverable

Your service is made discoverable through the `middleware.ts` configuration:

```typescript
'/api/screen/:chain/:address': {
  price: '$0.005',
  network: 'base',
  config: {
    discoverable: true,  // This flag enables Bazaar listing
    description: 'Screen cryptocurrency addresses...',
    outputSchema: { /* Full JSON Schema */ }
  }
}
```

### Service Metadata Exposed to Bazaar

When `discoverable: true` is set, the following information is automatically exposed:

1. **Endpoint Information**:
   - URL pattern: `/api/screen/:chain/:address`
   - HTTP method: GET
   - Price: $0.005 per request
   - Network: Base mainnet

2. **Description**:
   - Service purpose and capabilities
   - Input parameter descriptions
   - Expected use cases

3. **Input Schema**:
   - Path parameters: `chain` (ethereum|base) and `address` (0x-prefixed hex)
   - No body or query parameters required

4. **Output Schema**:
   - Complete JSON Schema of the response
   - All fields documented with types and descriptions
   - Required vs optional fields specified

5. **Payment Details**:
   - Supported payment scheme (x402-stablecoin)
   - Payment asset (USDC)
   - Payment network (Base)
   - Recipient address

### How AI Agents Discover Your Service

1. **Automatic Indexing**:
   - The x402 Bazaar crawler periodically scans deployed x402 services
   - It looks for services with `discoverable: true`
   - Metadata is extracted from your middleware configuration

2. **Service Registration**:
   - No manual registration required
   - Your service appears in Bazaar within 24-48 hours of deployment
   - Updates are picked up automatically when you redeploy

3. **Agent Discovery Process**:
   ```
   AI Agent needs wallet screening
     ↓
   Queries x402 Bazaar for "sanctions" or "OFAC"
     ↓
   Discovers your service with full schema
     ↓
   Generates x402 payment
     ↓
   Calls your API with payment header
     ↓
   Receives screening results
   ```

### Verifying Your Bazaar Listing

1. **Check Service Status**:
   - Visit the x402 Bazaar (URL will be provided by x402 team)
   - Search for "wallet screening" or "OFAC"
   - Verify your service appears with correct metadata

2. **Test Discovery Endpoint** (if available):
   ```bash
   curl https://your-app.vercel.app/.well-known/x402-service.json
   ```

3. **Monitor Discoverability**:
   - Check Vercel logs for requests from Bazaar crawler
   - User-Agent typically contains "x402" or "bazaar"

### Expected Indexing Timeline

- **Initial Deployment**: 24-48 hours for first indexing
- **Updates**: 4-24 hours for metadata changes to propagate
- **Removal**: If you set `discoverable: false`, delisting occurs in 24-48 hours

### Optimizing Your Bazaar Presence

1. **Description Quality**:
   - Be specific about what your service does
   - Include key terms AI agents might search for
   - Mention supported chains and data sources

2. **Schema Completeness**:
   - Fully document all response fields
   - Include examples in descriptions when helpful
   - Mark optional fields correctly

3. **Service Reliability**:
   - Maintain high uptime (>99%)
   - Keep response times low (<500ms p95)
   - Monitor for errors and fix quickly

### Troubleshooting Bazaar Listing

**Service Not Appearing**:
- Verify `discoverable: true` is set in middleware.ts
- Confirm deployment succeeded on Vercel
- Check that payment recipient address is valid
- Wait full 48 hours before escalating

**Incorrect Metadata**:
- Update middleware.ts configuration
- Deploy changes to Vercel
- Wait 4-24 hours for re-indexing
- Clear may take longer if cached

**Service Marked as Unavailable**:
- Check health endpoint is responding
- Verify payment validation is working
- Review Vercel logs for errors
- Test end-to-end payment flow

---

## Testing the X402 Payment Flow

### Prerequisites for Testing

Before testing payments:
- [ ] Service deployed to Vercel
- [ ] CDP credentials configured
- [ ] Payment recipient address set
- [ ] OFAC data initialized in Redis
- [ ] You have a wallet with USDC on Base mainnet

### Test 1: Payment Wall Display

Test that unpaid requests show the payment UI.

1. **Make Request Without Payment**:
   ```bash
   curl -v https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890
   ```

2. **Expected Response**:
   - Status: `402 Payment Required`
   - Headers include: `X-Payment-Required: true`
   - Body contains payment requirements
   - If accessed via browser, displays payment UI with onramp option

3. **Verify Payment Requirements**:
   ```json
   {
     "error": "Payment required",
     "code": "PAYMENT_REQUIRED",
     "payment_details": {
       "paymentRequirements": [{
         "scheme": "exact",
         "network": "base",
         "maxAmountRequired": "5000",
         "resource": "https://your-app.vercel.app/api/screen",
         "description": "Screen cryptocurrency addresses against OFAC sanctions lists",
         "mimeType": "application/json",
         "payTo": "0x...",
         "maxTimeoutSeconds": 300,
         "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
       }]
     }
   }
   ```

### Test 2: Onramp Integration

Test that users without USDC can purchase it.

1. **Access Payment Wall in Browser**:
   ```
   https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890
   ```

2. **Verify Onramp Widget**:
   - Payment wall should display
   - "Buy USDC" button should be visible
   - Clicking button opens Coinbase onramp
   - Onramp shows correct amount ($0.005 + fees)
   - Destination network is Base
   - Asset is USDC

3. **Complete Onramp Flow** (optional, involves real money):
   - Click "Buy USDC"
   - Follow Coinbase prompts
   - Purchase USDC (minimum purchase may apply)
   - Wait for delivery to your wallet

### Test 3: X402 Payment with Valid Wallet

Test the full payment flow with an x402-compatible wallet.

**Prerequisites**:
- X402-compatible wallet (e.g., Coinbase Wallet with x402 support)
- At least 0.01 USDC on Base mainnet

1. **Using X402 CLI** (if available):
   ```bash
   x402 pay \
     --url https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890 \
     --network base
   ```

2. **Using X402 SDK**:
   ```typescript
   import { createX402Payment } from '@coinbase/x402';

   const payment = await createX402Payment({
     amount: '5000', // 0.005 USDC in base units (6 decimals)
     recipient: '0x...', // Your recipient address
     network: 'base',
     asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
   });

   const response = await fetch(
     'https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890',
     {
       headers: {
         'X-Payment': payment.toBase64()
       }
     }
   );

   const result = await response.json();
   console.log(result);
   ```

3. **Expected Response**:
   - Status: `200 OK`
   - Body contains screening results
   - Payment is verified and settled
   - Your recipient address receives USDC

### Test 4: Verify Payment Receipt

Confirm that payments are actually received.

1. **Check Recipient Balance**:
   ```bash
   # Using a block explorer
   https://basescan.org/address/0xYOUR_RECIPIENT_ADDRESS

   # Or using curl to check USDC balance
   curl https://base-mainnet.g.alchemy.com/v2/YOUR-KEY \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "eth_call",
       "params": [{
         "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
         "data": "0x70a08231000000000000000000000000YOUR_RECIPIENT_ADDRESS"
       }, "latest"],
       "id": 1
     }'
   ```

2. **Verify Transaction**:
   - Check that USDC amount matches price per check
   - Confirm sender matches the payer in payment payload
   - Verify timestamp is recent

### Test 5: End-to-End Screening Flow

Test the complete screening workflow with payment.

1. **Test Clean Address**:
   ```bash
   # Use x402 client to make paid request
   x402 pay --url https://your-app.vercel.app/api/screen/ethereum/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
   ```

   Expected response:
   ```json
   {
     "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
     "chain": "ethereum",
     "sanctioned": false,
     "risk_level": "clear",
     "flags": [],
     "checked_at": "2025-10-01T10:30:00Z",
     "sources": ["ofac_github"],
     "cache_hit": false
   }
   ```

2. **Test Sanctioned Address**:
   ```bash
   # Known OFAC sanctioned address
   x402 pay --url https://your-app.vercel.app/api/screen/ethereum/0x8589427373D6D84E98730D7795D8f6f8731FDA16
   ```

   Expected response:
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

3. **Test Caching**:
   - Make the same request twice
   - Second request should return `"cache_hit": true`
   - Response should be faster (<100ms)

### Test 6: Rate Limiting

Verify rate limits are working correctly.

1. **Test Free Tier Limit**:
   ```bash
   # Make 11 requests without payment (limit is 10)
   for i in {1..11}; do
     curl https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890
     echo "\n"
   done
   ```

   Expected:
   - First 10 requests: 402 Payment Required
   - 11th request: 429 Too Many Requests

2. **Check Rate Limit Headers**:
   ```bash
   curl -v https://your-app.vercel.app/api/screen/ethereum/0x1234567890123456789012345678901234567890
   ```

   Headers should include:
   ```
   X-RateLimit-Limit: 10
   X-RateLimit-Remaining: 9
   X-RateLimit-Reset: 2025-10-01T11:00:00Z
   ```

### Test 7: Error Handling

Test that errors are handled gracefully.

1. **Invalid Chain**:
   ```bash
   curl https://your-app.vercel.app/api/screen/solana/0x1234...
   ```

   Expected: `400 Bad Request` with error message

2. **Invalid Address**:
   ```bash
   curl https://your-app.vercel.app/api/screen/ethereum/invalid
   ```

   Expected: `400 Bad Request` with error message

3. **Invalid Payment**:
   ```bash
   curl https://your-app.vercel.app/api/screen/ethereum/0x1234... \
     -H "X-Payment: invalid-base64"
   ```

   Expected: `402 Payment Required` (invalid payment ignored)

### Common Testing Issues

**Issue**: Payment not verified
- Check CDP API credentials are correct
- Verify payment recipient address matches
- Confirm USDC contract address is correct for network
- Check Vercel logs for validation errors

**Issue**: Onramp not loading
- Verify CDP_CLIENT_KEY is set
- Check browser console for errors
- Confirm domain is whitelisted in CDP settings

**Issue**: Payments received but API still returns 402
- Check payment amount matches expected price
- Verify payment network is Base
- Confirm USDC contract address is correct
- Check facilitator service status

---

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **API Health**:
   - Endpoint: `GET /api/health`
   - Monitor: Response time, status, checks.redis, checks.ofac_data
   - Alert on: status != "healthy" or response time > 1000ms

2. **Payment Success Rate**:
   - Track: Successful payment validations vs. failed
   - Target: >95% success rate
   - Monitor via: Vercel logs, CDP dashboard

3. **OFAC Data Freshness**:
   - Check: Last update timestamp in Redis
   - Alert on: Data older than 26 hours
   - Verify: GitHub Action runs successfully

4. **Cache Performance**:
   - Monitor: Cache hit rate (should be >80%)
   - Track: Redis memory usage
   - Alert on: Memory >90% full

5. **Rate Limiting**:
   - Track: Rate limit rejections
   - Monitor: Free vs. paid tier usage
   - Adjust limits based on patterns

### Setting Up Monitoring

#### Vercel Analytics

Automatically enabled:
1. Go to project dashboard
2. Click "Analytics" tab
3. View:
   - Request volume
   - Response times (p50, p75, p95, p99)
   - Error rates
   - Geographic distribution

#### Uptime Monitoring

Use external monitoring service:

**Recommended Services**:
- UptimeRobot (free): https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Better Uptime: https://betteruptime.com

**Configure Health Check**:
```
URL: https://your-app.vercel.app/api/health
Interval: 5 minutes
Alert on: Non-200 status or >5s response time
```

#### Log Monitoring

**Vercel Logs**:
1. Go to project dashboard
2. Click "Logs" tab
3. Filter by:
   - Error level
   - Specific endpoints
   - Time range

**Key Log Messages to Monitor**:
```
ERROR - X402 payment validation error
ERROR - Payment recipient address not configured
ERROR - CDP API credentials not configured
WARN - X402 payment verification failed
INFO - OFAC data synced successfully
```

#### Payment Monitoring

**CDP Dashboard**:
1. Log in to https://portal.cdp.coinbase.com
2. View transaction history
3. Monitor:
   - Payment volume
   - Success rate
   - Average transaction value
   - Failed payment reasons

**On-Chain Monitoring**:
- Use BaseScan to monitor recipient address
- Set up wallet notifications for incoming transfers
- Track cumulative revenue

### Maintenance Tasks

#### Daily
- [ ] Check health endpoint status
- [ ] Verify OFAC data sync completed (check GitHub Actions)
- [ ] Review error logs in Vercel
- [ ] Monitor payment success rate

#### Weekly
- [ ] Review API usage patterns
- [ ] Check Redis memory usage
- [ ] Verify cache hit rate is healthy
- [ ] Review rate limiting effectiveness
- [ ] Check for unusual traffic patterns

#### Monthly
- [ ] Review and adjust pricing if needed
- [ ] Update dependencies (`npm update`)
- [ ] Review and optimize rate limits
- [ ] Analyze revenue vs. costs
- [ ] Review security advisories

### Updating Pricing

To change the price per screening check:

1. **Update Environment Variable**:
   - Go to Vercel project settings
   - Environment Variables
   - Edit `PRICE_PER_CHECK`
   - Example: Change from `0.005` to `0.01`

2. **Update Middleware** (if needed):
   - Edit `middleware.ts`
   - Update price in endpoint configuration
   - Commit and push changes

3. **Deploy**:
   - Vercel automatically deploys on push
   - Or manually deploy from dashboard

4. **Verify**:
   - Test payment requirements endpoint
   - Confirm new price is reflected
   - Update documentation

### OFAC Data Updates

Data is automatically updated daily via GitHub Actions.

**Verify Updates**:
```bash
curl https://your-app.vercel.app/api/health
```

Check `ofac_data: true` in response.

**Manual Update**:
```bash
curl -X POST https://your-app.vercel.app/api/data/sync-ofac \
  -H "Authorization: Bearer YOUR_OFAC_SYNC_API_KEY"
```

**Troubleshooting Failed Updates**:
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Test sync endpoint manually
4. Check Redis capacity
5. Verify OFAC GitHub repo is accessible

### Handling Payment Failures

**Common Causes**:
1. Insufficient USDC in payer wallet
2. Network congestion (high gas fees)
3. Invalid payment signature
4. Payment expired (>5 minutes old)
5. Wrong network (not Base)

**Debugging Steps**:
1. Check Vercel logs for validation errors
2. Verify CDP API credentials are valid
3. Test payment flow with known-good wallet
4. Check facilitator service status
5. Review transaction on BaseScan

**User Support**:
- Provide clear error messages
- Direct users to check wallet balance
- Verify they're on correct network
- Suggest trying onramp if no USDC

### Scaling Considerations

**When to Scale**:
- Consistent >10,000 requests/day
- Redis memory >80% utilized
- Response times >500ms p95
- Payment volume requires higher throughput

**Scaling Options**:
1. **Upstash Redis**:
   - Upgrade to larger instance
   - Consider Global database for worldwide latency

2. **Vercel**:
   - Automatically scales (no action needed)
   - Consider Pro plan for advanced analytics

3. **Rate Limits**:
   - Increase paid tier limits
   - Add new tiers for high-volume users

4. **Caching**:
   - Increase TTLs for stable data
   - Add CDN caching for static responses

---

## Production Readiness Checklist

Complete this checklist before launching to production users.

### Security Review

- [ ] **Environment Variables**:
  - [ ] All secrets stored in Vercel (not in code)
  - [ ] No credentials committed to Git
  - [ ] `.env.local` in `.gitignore`

- [ ] **API Security**:
  - [ ] Rate limiting configured and tested
  - [ ] Payment validation working correctly
  - [ ] Input validation on all endpoints
  - [ ] CORS configured appropriately
  - [ ] No sensitive data in error messages

- [ ] **Payment Security**:
  - [ ] Recipient address verified and secure
  - [ ] CDP credentials protected
  - [ ] Payment amounts validated
  - [ ] Transaction verification working

- [ ] **Data Security**:
  - [ ] Redis connection uses TLS
  - [ ] No PII stored in cache
  - [ ] Data retention policies defined
  - [ ] Compliance with sanctions regulations

### Performance Testing

- [ ] **Load Testing**:
  - [ ] Test with 100 concurrent requests
  - [ ] Verify response times <500ms p95
  - [ ] Confirm no memory leaks
  - [ ] Test Redis performance under load

- [ ] **Cache Testing**:
  - [ ] Verify cache hit rate >80%
  - [ ] Test cache invalidation
  - [ ] Confirm TTLs working correctly
  - [ ] Test cache miss performance

- [ ] **Payment Flow**:
  - [ ] Test payment verification speed
  - [ ] Verify facilitator service latency
  - [ ] Test onramp loading times
  - [ ] Confirm payment settlement time

### Functionality Testing

- [ ] **Core Features**:
  - [ ] Health check endpoint responding
  - [ ] Screening endpoint working for both chains
  - [ ] Payment wall displays correctly
  - [ ] Onramp integration functional
  - [ ] Session token generation working

- [ ] **Edge Cases**:
  - [ ] Invalid addresses handled gracefully
  - [ ] Unsupported chains rejected properly
  - [ ] Rate limits enforced correctly
  - [ ] Payment failures handled well
  - [ ] Cache misses don't break service

- [ ] **Data Quality**:
  - [ ] OFAC data loaded correctly
  - [ ] Known sanctioned addresses flagged
  - [ ] Clean addresses return negative results
  - [ ] Data updates working automatically

### Operational Readiness

- [ ] **Monitoring**:
  - [ ] Health check monitoring configured
  - [ ] Uptime alerts set up
  - [ ] Error logging reviewed
  - [ ] Payment monitoring in place
  - [ ] Performance metrics tracked

- [ ] **Documentation**:
  - [ ] API documentation complete
  - [ ] Environment setup documented
  - [ ] Deployment process documented
  - [ ] Troubleshooting guide available
  - [ ] Support contact information ready

- [ ] **Backup & Recovery**:
  - [ ] Redis backup strategy defined
  - [ ] Deployment rollback tested
  - [ ] Data recovery process documented
  - [ ] Incident response plan created

### Compliance & Legal

- [ ] **Sanctions Compliance**:
  - [ ] OFAC data source verified
  - [ ] Update frequency appropriate
  - [ ] Results accuracy validated
  - [ ] Legal review of service completed

- [ ] **Terms of Service**:
  - [ ] API terms of service created
  - [ ] Payment terms documented
  - [ ] Data usage policy defined
  - [ ] Limitation of liability stated

- [ ] **Privacy**:
  - [ ] Privacy policy created
  - [ ] Data retention policy defined
  - [ ] User data handling documented
  - [ ] GDPR considerations addressed (if applicable)

### Business Readiness

- [ ] **Pricing Validation**:
  - [ ] Price per check verified
  - [ ] Revenue model sustainable
  - [ ] Costs calculated (Vercel, Upstash, CDP)
  - [ ] Break-even analysis completed

- [ ] **Support Plan**:
  - [ ] Support contact method defined
  - [ ] Response time SLA set
  - [ ] Escalation process created
  - [ ] FAQ prepared for common issues

- [ ] **Growth Plan**:
  - [ ] Scaling strategy defined
  - [ ] Budget for increased usage planned
  - [ ] Feature roadmap created
  - [ ] Marketing plan in place

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Health Check Fails (redis: false)

**Symptoms**:
```json
{
  "status": "unhealthy",
  "checks": {
    "redis": false,
    "ofac_data": true
  }
}
```

**Possible Causes**:
1. Redis credentials incorrect
2. Redis instance down
3. Network connectivity issues
4. Redis memory full

**Solutions**:
1. Verify environment variables:
   ```bash
   # Check Vercel environment variables
   # Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set
   ```

2. Test Redis connection directly:
   ```bash
   curl https://your-redis.upstash.io/ping \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. Check Upstash dashboard for instance status

4. Check Redis memory usage, upgrade if needed

#### Issue: Health Check Fails (ofac_data: false)

**Symptoms**:
```json
{
  "status": "unhealthy",
  "checks": {
    "redis": true,
    "ofac_data": false
  }
}
```

**Possible Causes**:
1. OFAC data not seeded
2. Data expired (TTL exceeded)
3. Data sync failed
4. Redis data corrupted

**Solutions**:
1. Run seed script:
   ```bash
   npx tsx scripts/seed-redis.ts
   ```

2. Manually sync data:
   ```bash
   curl -X POST https://your-app.vercel.app/api/data/sync-ofac \
     -H "Authorization: Bearer YOUR_OFAC_SYNC_API_KEY"
   ```

3. Check GitHub Actions logs for sync failures

4. Verify OFAC GitHub repository is accessible

#### Issue: Payment Validation Always Fails

**Symptoms**:
- All payments return 402 even with valid payment header
- Logs show "X402 payment validation error"

**Possible Causes**:
1. CDP credentials missing or invalid
2. Wrong payment recipient address
3. Network mismatch (testnet vs mainnet)
4. USDC contract address incorrect

**Solutions**:
1. Verify CDP credentials in Vercel:
   - CDP_API_KEY_ID format: `organizations/{org}/apiKeys/{key}`
   - CDP_API_KEY_SECRET is complete PEM key

2. Check payment recipient address:
   - Must be valid Ethereum address
   - Must match address in payment payload

3. Verify network configuration:
   - Production should use `base`
   - Development uses `base-sepolia`
   - Check NODE_ENV setting

4. Check USDC contract addresses in validator.ts

#### Issue: Onramp Widget Not Loading

**Symptoms**:
- Payment wall shows but onramp button missing or broken
- Browser console shows CDP errors

**Possible Causes**:
1. CDP_CLIENT_KEY not set
2. Client key invalid or expired
3. Domain not whitelisted in CDP
4. JavaScript errors

**Solutions**:
1. Verify CDP_CLIENT_KEY in Vercel environment variables

2. Check CDP portal for client key status

3. Whitelist your domain in CDP settings:
   - Go to CDP portal
   - Onramp settings
   - Add your domain

4. Check browser console for specific errors

#### Issue: Rate Limiting Not Working

**Symptoms**:
- Can make unlimited requests
- Rate limit headers not present

**Possible Causes**:
1. Redis connection failing
2. Rate limiter not initialized
3. Client identifier extraction failing

**Solutions**:
1. Verify Redis health check passes

2. Check Vercel logs for rate limiter errors

3. Test rate limiting:
   ```bash
   for i in {1..15}; do curl https://your-app.vercel.app/api/health; done
   ```

4. Verify rate limit configuration in environment variables

#### Issue: Slow Response Times

**Symptoms**:
- API responses taking >1 second
- Timeouts occurring

**Possible Causes**:
1. Redis latency high
2. OFAC data lookup slow
3. Payment validation slow
4. Cold start delays

**Solutions**:
1. Check Redis region matches Vercel region

2. Verify cache hit rate is high:
   - Check response `cache_hit` field
   - Should be >80% for repeated requests

3. Consider upgrading Redis instance

4. Monitor Vercel function execution time

#### Issue: Payments Received but Not Credited

**Symptoms**:
- USDC appears in recipient wallet
- But API still returns 402 Payment Required

**Possible Causes**:
1. Payment verification timing issue
2. Facilitator service lag
3. Transaction not confirmed

**Solutions**:
1. Verify transaction is confirmed on-chain

2. Check facilitator service status

3. Review payment validation logs

4. Test with increased timeout

#### Issue: GitHub Actions Data Sync Failing

**Symptoms**:
- GitHub Actions workflow fails
- OFAC data becomes stale

**Possible Causes**:
1. Secrets not configured
2. API endpoint unreachable
3. Authorization failing
4. Rate limiting

**Solutions**:
1. Verify GitHub secrets are set:
   - VERCEL_API_URL
   - OFAC_SYNC_API_KEY

2. Test sync endpoint manually:
   ```bash
   curl -X POST https://your-app.vercel.app/api/data/sync-ofac \
     -H "Authorization: Bearer YOUR_KEY"
   ```

3. Check Vercel logs for sync endpoint errors

4. Review GitHub Actions logs for specific error

### Getting Help

**Resources**:
1. **Vercel Support**:
   - Documentation: https://vercel.com/docs
   - Support: https://vercel.com/support

2. **Upstash Support**:
   - Documentation: https://docs.upstash.com
   - Discord: https://upstash.com/discord

3. **Coinbase Developer Platform**:
   - Documentation: https://docs.cdp.coinbase.com
   - Support: https://portal.cdp.coinbase.com/support

4. **X402 Protocol**:
   - Documentation: https://x402.org/docs
   - GitHub: https://github.com/coinbase/x402

**Support Checklist**:
When seeking help, provide:
- [ ] Vercel deployment logs
- [ ] Error messages from browser console
- [ ] Steps to reproduce the issue
- [ ] Expected vs. actual behavior
- [ ] Environment (production/preview)
- [ ] Timestamp of issue occurrence

---

## Conclusion

Congratulations! You've successfully deployed the x402 wallet screening API to production. Your service is now:

- ✅ Running on Vercel with global edge functions
- ✅ Protected by X402 payment protocol
- ✅ Discoverable by AI agents via Bazaar
- ✅ Integrated with Coinbase onramp
- ✅ Automatically updating OFAC data daily
- ✅ Monitoring health and performance

### Next Steps

1. **Monitor Initial Performance**:
   - Watch for errors in first 24 hours
   - Verify data sync runs successfully
   - Confirm payments are being received

2. **Gather Feedback**:
   - Test with real users or agents
   - Note any issues or friction points
   - Iterate on UX and documentation

3. **Optimize**:
   - Adjust rate limits based on usage
   - Fine-tune pricing as needed
   - Improve response times

4. **Scale**:
   - Add more blockchain networks
   - Implement batch screening
   - Add advanced features

### Need Help?

If you encounter issues not covered in this guide:
1. Check Vercel and Upstash logs
2. Review the troubleshooting section
3. Consult platform documentation
4. Open an issue on GitHub

Happy deploying!
