import { ethers } from 'ethers';

const WALLET = '0xbD41f24168794023b5691EF1beF69783932EcaB9';
const USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const RPC_URL = 'https://sepolia.base.org';

async function checkBalance() {
  console.log('🔍 Checking Wallet Balance on Base Sepolia\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Check ETH balance
  const ethBalance = await provider.getBalance(WALLET);
  console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  // Check USDC balance
  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  const usdc = new ethers.Contract(USDC_SEPOLIA, usdcAbi, provider);

  try {
    const balance = await usdc.balanceOf(WALLET);
    const decimals = await usdc.decimals();
    const formattedBalance = ethers.formatUnits(balance, decimals);

    console.log(`💵 USDC Balance: ${formattedBalance} USDC`);
    console.log(`   Raw balance: ${balance.toString()}`);
    console.log(`   Decimals: ${decimals}`);

    if (balance >= ethers.parseUnits('0.005', decimals)) {
      console.log('\n✅ Sufficient balance for payment (need 0.005 USDC)');
    } else {
      console.log('\n❌ Insufficient balance (need 0.005 USDC)');
    }

  } catch (error: any) {
    console.error('❌ Error checking USDC:', error.message);
  }
}

checkBalance();
