import { ethers } from 'ethers';

const USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const RPC_URL = 'https://sepolia.base.org';

async function checkUSDCDomain() {
  console.log('🔍 Checking USDC Contract on Base Sepolia\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // EIP-712 domain getters
  const abi = [
    'function name() view returns (string)',
    'function version() view returns (string)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
  ];

  const usdc = new ethers.Contract(USDC_SEPOLIA, abi, provider);

  try {
    const name = await usdc.name();
    const version = await usdc.version();
    const domainSeparator = await usdc.DOMAIN_SEPARATOR();

    console.log('✅ USDC Contract Info:');
    console.log(`  Name: ${name}`);
    console.log(`  Version: ${version}`);
    console.log(`  Domain Separator: ${domainSeparator}`);

    console.log('\n📝 Use this in EIP-712 domain:');
    console.log(`  name: "${name}"`);
    console.log(`  version: "${version}"`);
    console.log(`  chainId: 84532`);
    console.log(`  verifyingContract: "${USDC_SEPOLIA}"`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkUSDCDomain();
