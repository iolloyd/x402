import { ethers } from 'ethers';

console.log('🔐 Creating Test Wallet for X402 Testing\n');

const wallet = ethers.Wallet.createRandom();

console.log('✅ New wallet created!');
console.log('\n📍 Address:', wallet.address);
console.log('🔑 Private Key:', wallet.privateKey);
console.log('\n⚠️  SAVE THIS INFORMATION SECURELY!\n');

console.log('Next steps:');
console.log('1. Fund this wallet with Base Sepolia ETH (for gas):');
console.log('   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
console.log('\n2. Get Base Sepolia USDC:');
console.log('   https://faucet.circle.com/');
console.log('\n3. Set the private key:');
console.log(`   export PRIVATE_KEY="${wallet.privateKey}"`);
console.log('\n4. Run the payment test:');
console.log('   npx tsx scripts/test-x402-payment.ts');
