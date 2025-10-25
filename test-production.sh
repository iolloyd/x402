#!/bin/bash
# Production Deployment Test Script
# Run this from your local machine (not the restricted environment)

set -e

DOMAIN="https://clearwallet.app"

echo "🧪 Testing ClearWallet Production Deployment"
echo "=============================================="
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s "$DOMAIN/api/health")
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    echo "✅ Health check passed"
    echo "$HEALTH" | jq .
else
    echo "❌ Health check failed"
    echo "$HEALTH"
fi
echo ""

# Test 2: Docs Page
echo "2️⃣ Testing API Documentation..."
DOCS=$(curl -s "$DOMAIN/docs" | head -5)
if echo "$DOCS" | grep -q "swagger" || echo "$DOCS" | grep -q "html"; then
    echo "✅ Docs page is live"
else
    echo "❌ Docs page failed"
    echo "$DOCS"
fi
echo ""

# Test 3: Dashboard Page
echo "3️⃣ Testing Customer Dashboard..."
DASHBOARD=$(curl -s "$DOMAIN/dashboard?customer_id=test_123" | head -5)
if echo "$DASHBOARD" | grep -q "html" || echo "$DASHBOARD" | grep -q "<!DOCTYPE"; then
    echo "✅ Dashboard is live"
else
    echo "❌ Dashboard failed"
    echo "$DASHBOARD"
fi
echo ""

# Test 4: OpenAPI Spec
echo "4️⃣ Testing OpenAPI Specification..."
OPENAPI=$(curl -s "$DOMAIN/openapi.yaml" | head -2)
if echo "$OPENAPI" | grep -q "openapi:"; then
    echo "✅ OpenAPI spec is accessible"
else
    echo "❌ OpenAPI spec failed"
    echo "$OPENAPI"
fi
echo ""

# Test 5: Screening Endpoint (should fail without API key - that's good!)
echo "5️⃣ Testing Screening Endpoint (should require auth)..."
SCREEN=$(curl -s "$DOMAIN/api/screen/btc/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
if echo "$SCREEN" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$SCREEN" | jq -r '.error')
    if [[ "$ERROR_MSG" == *"Authentication required"* ]] || [[ "$ERROR_MSG" == *"payment"* ]]; then
        echo "✅ Auth protection is working"
        echo "$SCREEN" | jq .
    else
        echo "⚠️  Got error but unexpected: $ERROR_MSG"
    fi
else
    echo "❌ Unexpected response"
    echo "$SCREEN"
fi
echo ""

# Test 6: Create API Key Endpoint
echo "6️⃣ Testing API Key Creation Endpoint..."
CREATE_KEY=$(curl -s -X POST "$DOMAIN/api/keys" \
    -H "Content-Type: application/json" \
    -d '{"customer_id":"test_customer_123","name":"Test Key","tier":"free"}')

if echo "$CREATE_KEY" | jq -e '.key' > /dev/null 2>&1; then
    echo "✅ API key creation works!"
    API_KEY=$(echo "$CREATE_KEY" | jq -r '.key')
    echo "Generated test API key: ${API_KEY:0:20}..."

    # Test 7: Use the API key
    echo ""
    echo "7️⃣ Testing Screening with API Key..."
    SCREEN_WITH_KEY=$(curl -s "$DOMAIN/api/screen/btc/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" \
        -H "X-API-Key: $API_KEY")

    if echo "$SCREEN_WITH_KEY" | jq -e '.address' > /dev/null 2>&1; then
        echo "✅ Screening with API key works!"
        echo "$SCREEN_WITH_KEY" | jq .
    else
        echo "❌ Screening with API key failed"
        echo "$SCREEN_WITH_KEY"
    fi
else
    echo "⚠️  API key creation needs authentication or returned error"
    echo "$CREATE_KEY"
fi

echo ""
echo "=============================================="
echo "✅ Production deployment test complete!"
echo ""
echo "Next steps:"
echo "1. Visit https://clearwallet.app/docs to see API documentation"
echo "2. Visit https://clearwallet.app/dashboard?customer_id=YOUR_ID to create API keys"
echo "3. Initialize OFAC data by calling /api/data/sync-ofac"
