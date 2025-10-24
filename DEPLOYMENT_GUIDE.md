# 🚀 ClearWallet Deployment Guide

## Current Status

✅ **Code merged to main branch** (local)
✅ **Build verified successful**
⚠️ **Needs to be pushed from your local machine**

---

## Step 1: Push to GitHub (From Your Local Machine)

Since we're in a remote environment, you'll need to push from your local machine:

```bash
# On your local machine:
cd /path/to/x402

# Pull the latest main (includes all our changes)
git fetch origin
git checkout main
git pull origin main

# If the above doesn't have the merge, pull from Claude's branch:
git fetch origin claude/improve-code-011CUM5vsgTnqfnmmd2Ac52E
git merge origin/claude/improve-code-011CUM5vsgTnqfnmmd2Ac52E

# Push to GitHub
git push origin main
```

**Or simply:** The changes are already in the feature branch on GitHub. You can merge via GitHub UI:
1. Go to: https://github.com/iolloyd/x402/pull/new/claude/improve-code-011CUM5vsgTnqfnmmd2Ac52E
2. Click "Create Pull Request"
3. Review changes (4,746 lines added!)
4. Click "Merge Pull Request"
5. Delete the feature branch (optional)

---

## Step 2: Deploy to Vercel (2 minutes)

### Option A: Vercel Dashboard (Easiest)

1. **Go to https://vercel.com/new**
2. **Import Git Repository**
   - Click "Import Git Repository"
   - Select: `iolloyd/x402`
   - Branch: `main`
3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
4. **Click "Deploy"**
   - First deploy will fail (missing env vars) - that's OK!

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /path/to/x402
vercel --prod
```

---

## Step 3: Configure Environment Variables

In **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

### Required (Core Functionality)

```bash
# Redis (Upstash) - MUST HAVE
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# X402 Payments - MUST HAVE
PAYMENT_RECIPIENT_ADDRESS=0xYourWalletAddress

# Screening Price
PRICE_PER_CHECK=0.005
```

### Required for Billing (Stripe)

```bash
# Stripe API Keys - Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Webhook Secret - Get after setting up webhook (Step 5)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs - Get from https://dashboard.stripe.com/prices
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...
```

### Optional (Enhanced Features)

```bash
# Admin API Key for OFAC sync
OFAC_SYNC_API_KEY=your_secret_key_here

# Payment Verification RPC
PAYMENT_VERIFICATION_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY

# Coinbase Developer Platform (for onramp)
CDP_CLIENT_KEY=your_cdp_client_key
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret

# Rate Limit Overrides (optional)
FREE_TIER_LIMIT=10
PAID_TIER_LIMIT_PER_MINUTE=100
PAID_TIER_LIMIT_PER_DAY=10000
ADMIN_RATE_LIMIT=10
```

**After adding all variables, click "Redeploy" in Vercel Dashboard**

---

## Step 4: Set Up Stripe Products & Prices

### 4.1 Create Products

In Stripe Dashboard → **Products** → **Add Product**:

**Product 1: ClearWallet Starter**
- Name: `ClearWallet Starter`
- Description: `100 requests/min, 10K requests/day`
- Pricing: `$99 / month`
- Billing: Recurring
- Copy the **Price ID** → Use for `STRIPE_PRICE_ID_STARTER`

**Product 2: ClearWallet Pro**
- Name: `ClearWallet Pro`
- Description: `500 requests/min, 100K requests/day`
- Pricing: `$499 / month`
- Billing: Recurring
- Copy the **Price ID** → Use for `STRIPE_PRICE_ID_PRO`

**Product 3: ClearWallet Enterprise**
- Name: `ClearWallet Enterprise`
- Description: `2000 requests/min, 1M requests/day`
- Pricing: `$2,999 / month`
- Billing: Recurring
- Copy the **Price ID** → Use for `STRIPE_PRICE_ID_ENTERPRISE`

### 4.2 Update Environment Variables

Go back to Vercel → Settings → Environment Variables:
- Add the 3 `STRIPE_PRICE_ID_*` variables
- Click **Redeploy**

---

## Step 5: Configure Stripe Webhook

In Stripe Dashboard → **Developers** → **Webhooks** → **Add Endpoint**:

**Endpoint URL:**
```
https://your-app.vercel.app/api/billing/webhook
```
(Replace `your-app.vercel.app` with your actual Vercel URL)

**Events to Send:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.paid`
- ✅ `invoice.payment_failed`

**After creating webhook:**
1. Copy the **Signing Secret** (starts with `whsec_`)
2. Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. **Redeploy** in Vercel

---

## Step 6: Test Your Deployment

### 6.1 Health Check

```bash
curl https://your-app.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T...",
  "version": "1.0.0",
  "correlation_id": "...",
  "checks": {
    "redis": true,
    "ofac_data": true,
    "config": true
  }
}
```

### 6.2 API Documentation

Open in browser:
```
https://your-app.vercel.app/docs
```

Should see Swagger UI with all endpoints documented.

### 6.3 Dashboard

Open in browser:
```
https://your-app.vercel.app/dashboard?customer_id=test_customer_123
```

Should see the dashboard interface.

### 6.4 Create Test API Key

1. Go to dashboard
2. Enter customer ID: `test_customer_123`
3. Click "Create New API Key"
4. Name: `Test Key`
5. Tier: `Free`
6. **Copy the API key** (shown only once!)

### 6.5 Test Screening Endpoint

```bash
curl https://your-app.vercel.app/api/screen/ethereum/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

**Expected Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "sanctioned": false,
  "risk_level": "clear",
  "flags": [],
  "checked_at": "2025-10-24T...",
  "sources": ["ofac_github"],
  "cache_hit": false,
  "correlation_id": "..."
}
```

### 6.6 Test Batch Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/screen/batch \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      {"chain": "ethereum", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}
    ]
  }'
```

---

## Step 7: Set Up Custom Domain (Optional)

In Vercel Dashboard → Your Project → **Settings** → **Domains**:

### Add Domain: `clearwallet.com`

1. Click **Add Domain**
2. Enter: `clearwallet.com`
3. Vercel will show DNS instructions

### Update DNS (at your domain registrar)

**Option A: Using A Record**
```
A    @    76.76.21.21
```

**Option B: Using CNAME (recommended)**
```
CNAME    @    cname.vercel-dns.com
```

**For API subdomain:**
```
CNAME    api    cname.vercel-dns.com
```

**Wait 5-30 minutes for DNS propagation**

Then access at:
- https://clearwallet.com
- https://api.clearwallet.com
- https://clearwallet.com/docs
- https://clearwallet.com/dashboard

---

## Step 8: Initialize OFAC Data

Your Redis database needs OFAC data. Run the seed script:

### Option A: Via Vercel CLI

```bash
# Install dependencies locally
npm install

# Run seed script
UPSTASH_REDIS_REST_URL=your_url \
UPSTASH_REDIS_REST_TOKEN=your_token \
npx tsx scripts/seed-redis.ts
```

### Option B: Via API Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/data/sync-ofac \
  -H "Authorization: Bearer YOUR_OFAC_SYNC_API_KEY"
```

**Expected:** ~148 OFAC addresses loaded into Redis

---

## Step 9: Monitor & Verify

### Check Vercel Logs

Vercel Dashboard → Your Project → **Logs**

Watch for:
- ✅ Successful requests
- ✅ Correlation IDs in logs
- ⚠️ Any errors

### Check Stripe Events

Stripe Dashboard → **Developers** → **Events**

Create a test subscription and verify:
- ✅ `customer.subscription.created` event received
- ✅ Webhook delivery successful
- ✅ Check Vercel logs for webhook processing

---

## 🎉 You're Live!

**Your ClearWallet API is now:**
- ✅ Deployed to production (Vercel Edge)
- ✅ Globally distributed (300+ locations)
- ✅ Sub-second response times
- ✅ Stripe billing integrated
- ✅ API documentation live
- ✅ Customer dashboard functional
- ✅ Ready for customers!

---

## Quick Reference

### Your URLs

```bash
# API Base
https://your-app.vercel.app

# Documentation
https://your-app.vercel.app/docs

# Dashboard
https://your-app.vercel.app/dashboard?customer_id=xxx

# Health Check
https://your-app.vercel.app/api/health

# OpenAPI Spec
https://your-app.vercel.app/openapi.yaml
```

### Key Endpoints

```bash
# Single screening
GET /api/screen/{chain}/{address}
Header: X-API-Key: cw_live_...

# Batch screening
POST /api/screen/batch
Header: X-API-Key: cw_live_...
Body: {"addresses": [...]}

# Create API key
POST /api/keys
Body: {"customer_id": "...", "name": "...", "tier": "free"}

# List API keys
GET /api/keys?customer_id=xxx

# Billing portal
POST /api/billing/portal
Body: {"stripe_customer_id": "cus_...", "return_url": "..."}
```

---

## Troubleshooting

### Build Fails

**Check:** Environment variables are set correctly in Vercel
**Fix:** Verify all required variables (especially Redis) are present

### Health Check Fails

**Check:** Redis connection
**Fix:** Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### OFAC Data Missing

**Check:** `health` endpoint shows `ofac_data: false`
**Fix:** Run seed script or call `/api/data/sync-ofac`

### Stripe Webhook Not Working

**Check:** Webhook signing secret is correct
**Fix:** Copy new secret from Stripe → Update in Vercel → Redeploy

### API Key Not Working

**Check:** Correlation ID in error response
**Fix:** Use correlation ID to search Vercel logs for details

---

## Next Steps After Deployment

1. **Test end-to-end flow** (signup → API key → screening)
2. **Create first real customer** (yourself or a friend)
3. **Launch on Product Hunt** (get first users)
4. **Launch on Hacker News** (get technical users)
5. **Direct outreach** (50 potential customers)
6. **Monitor metrics** (signups, API calls, revenue)

---

## Support

**If something breaks:**
1. Check Vercel logs (correlation IDs are your friend!)
2. Check Stripe events (webhook delivery)
3. Check Redis data (Upstash console)
4. Check environment variables (Settings → Environment Variables)

**Everything is built and ready. Just deploy and start getting customers!** 🚀

---

**Created:** 2025-10-24
**Repository:** iolloyd/x402
**Branch:** main (merged from claude/improve-code-011CUM5vsgTnqfnmmd2Ac52E)
**Status:** Ready for Production Deployment ✅
