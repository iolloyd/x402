import { ethers } from 'ethers';

/**
 * Test X402 Payment Flow
 *
 * Prerequisites:
 * 1. Set PRIVATE_KEY environment variable with test wallet
 * 2. Have test USDC on Base Sepolia (get from https://faucet.circle.com/)
 * 3. Server running on http://localhost:3000
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const CHAIN_ID = 84532; // Base Sepolia

async function testPaymentFlow() {
  console.log('🧪 Testing X402 Payment Flow\n');

  // Step 1: Check if private key is set
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable not set');
    console.log('\nTo set it:');
    console.log('export PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`✅ Wallet loaded: ${wallet.address}\n`);

  // Step 2: Request resource without payment
  console.log('Step 1: Request resource without payment...');
  const testAddress = '0x1234567890123456789012345678901234567890';
  const response1 = await fetch(`${API_URL}/api/screen/ethereum/${testAddress}`);

  if (response1.status !== 402) {
    console.error(`❌ Expected 402, got ${response1.status}`);
    process.exit(1);
  }

  const paymentRequired = await response1.json();
  console.log('✅ Received 402 Payment Required');
  console.log('Payment details:', JSON.stringify(paymentRequired, null, 2));

  const requirements = paymentRequired.payment_details.paymentRequirements[0];
  console.log(`\n💰 Payment required: ${requirements.amount} ${requirements.currency}`);
  console.log(`📍 Recipient: ${requirements.recipient}`);
  console.log(`🌐 Network: ${requirements.network}\n`);

  // Step 3: Create ERC-3009 authorization
  console.log('Step 2: Creating ERC-3009 payment authorization...');

  const domain = {
    name: 'USDC',  // Fixed: actual contract name is "USDC" not "USD Coin"
    version: '2',
    chainId: CHAIN_ID,
    verifyingContract: USDC_SEPOLIA,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const value = ethers.parseUnits(requirements.amount, 6); // USDC has 6 decimals
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  const message = {
    from: wallet.address,
    to: requirements.recipient,
    value: value,
    validAfter: validAfter,
    validBefore: validBefore,
    nonce: nonce,
  };

  console.log('Authorization details:');
  console.log(`  From: ${message.from}`);
  console.log(`  To: ${message.to}`);
  console.log(`  Value: ${value} (${requirements.amount} USDC)`);
  console.log(`  Valid until: ${new Date(validBefore * 1000).toISOString()}\n`);

  // Sign the authorization
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);

  console.log('✅ Authorization signed\n');

  // Step 4: Create X402 payment payload
  console.log('Step 3: Creating X402 payment payload...');

  const x402Payload = {
    x402Version: 1,
    scheme: 'erc3009',
    network: 'base-sepolia',
    payload: {
      from: wallet.address,
      to: requirements.recipient,
      value: value.toString(),
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(x402Payload)).toString('base64');
  console.log('✅ X402 payload created\n');

  // Step 5: Retry request with payment
  console.log('Step 4: Sending request with X-PAYMENT header...');

  const response2 = await fetch(`${API_URL}/api/screen/ethereum/${testAddress}`, {
    headers: {
      'X-PAYMENT': paymentHeader,
    },
  });

  console.log(`📡 Response status: ${response2.status}`);

  if (response2.ok) {
    const result = await response2.json();
    console.log('\n✅ SUCCESS! Payment accepted and screening completed');
    console.log('Screening result:', JSON.stringify(result, null, 2));
  } else {
    const error = await response2.json();
    console.log('\n❌ Payment validation failed');
    console.log('Error:', JSON.stringify(error, null, 2));
  }
}

// Run the test
testPaymentFlow().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
