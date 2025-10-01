import { ethers } from 'ethers';
import { X402PaymentPayload } from './types';
import * as logger from '@/utils/logger';

// ERC-3009 TransferWithAuthorization ABI
const ERC3009_ABI = [
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)'
];

// USDC contract addresses
const USDC_CONTRACTS: Record<string, string> = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

interface ERC3009Payload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    v: number;
    r: string;
    s: string;
  };
}

export async function validateX402Payment(
  paymentHeader: string,
  expectedAmount: string
): Promise<boolean> {
  try {
    // Decode base64 payment header
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
    const payment: ERC3009Payload = JSON.parse(decoded);

    logger.info('X402 payment received', {
      version: payment.x402Version,
      scheme: payment.scheme,
      network: payment.network
    });

    // Validate payment structure
    if (payment.x402Version !== 1) {
      logger.warn('Unsupported x402 version', { version: payment.x402Version });
      return false;
    }

    if (payment.scheme !== 'erc3009') {
      logger.warn('Unsupported payment scheme', { scheme: payment.scheme });
      return false;
    }

    const { payload, network } = payment;

    // Verify recipient address
    const recipientAddress = process.env.PAYMENT_RECIPIENT_ADDRESS;
    if (!recipientAddress) {
      logger.error('Payment recipient address not configured');
      return false;
    }

    if (payload.to.toLowerCase() !== recipientAddress.toLowerCase()) {
      logger.warn('Invalid recipient address', {
        expected: recipientAddress,
        received: payload.to
      });
      return false;
    }

    // Verify amount (USDC has 6 decimals)
    const expectedValueWei = ethers.parseUnits(expectedAmount, 6);
    const paymentValue = BigInt(payload.value);

    if (paymentValue < expectedValueWei) {
      logger.warn('Insufficient payment amount', {
        expected: expectedValueWei.toString(),
        received: payload.value
      });
      return false;
    }

    // Verify timestamp validity
    const now = Math.floor(Date.now() / 1000);
    if (payload.validAfter > now) {
      logger.warn('Payment not yet valid', {
        validAfter: payload.validAfter,
        now
      });
      return false;
    }

    if (payload.validBefore < now) {
      logger.warn('Payment authorization expired', {
        validBefore: payload.validBefore,
        now
      });
      return false;
    }

    // Get RPC URL for on-chain verification
    const rpcUrl = process.env.PAYMENT_VERIFICATION_RPC;
    if (!rpcUrl) {
      logger.error('Payment verification RPC not configured');
      return false;
    }

    // Get USDC contract address for network
    const usdcAddress = USDC_CONTRACTS[network];
    if (!usdcAddress) {
      logger.warn('Unsupported network', { network });
      return false;
    }

    // Connect to blockchain and verify signature
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(usdcAddress, ERC3009_ABI, provider);

    try {
      // Check if authorization has already been used
      const isUsed = await usdcContract.authorizationState(payload.from, payload.nonce);
      if (isUsed) {
        logger.warn('Payment authorization already used', {
          from: payload.from,
          nonce: payload.nonce
        });
        return false;
      }

      // Verify the authorization signature by simulating the call
      // This will revert if the signature is invalid
      await usdcContract.transferWithAuthorization.staticCall(
        payload.from,
        payload.to,
        payload.value,
        payload.validAfter,
        payload.validBefore,
        payload.nonce,
        payload.v,
        payload.r,
        payload.s
      );

      logger.info('X402 payment validated successfully', {
        from: payload.from,
        to: payload.to,
        value: payload.value,
        network
      });

      return true;

    } catch (error: any) {
      // Check specific error messages
      if (error.message?.includes('already used')) {
        logger.warn('Payment already processed', {
          from: payload.from,
          nonce: payload.nonce
        });
        return false;
      }

      // If the error is "insufficient balance", the signature is valid but payment cannot be processed
      if (error.message?.includes('transfer amount exceeds balance') ||
          error.message?.includes('insufficient balance')) {
        logger.warn('Payment authorization valid but insufficient funds', {
          from: payload.from,
          to: payload.to,
          value: payload.value
        });
        // Production: require actual USDC balance
        return false;
      }

      logger.error('Payment signature verification failed', {
        error: error.message || String(error)
      });
      return false;
    }

  } catch (error) {
    logger.error('X402 payment validation error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// Alternative: Use Coinbase Facilitator for verification
export async function validateViaFacilitator(
  paymentPayload: any,
  paymentRequirements: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://facilitator.cdp.coinbase.com/verify';

    const response = await fetch(facilitatorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.warn('Facilitator verification failed', {
        status: response.status,
        error
      });
      return { valid: false, error: 'Facilitator verification failed' };
    }

    const result = await response.json();

    logger.info('Facilitator verification result', result);

    return {
      valid: result.valid || false,
      error: result.error
    };

  } catch (error: any) {
    logger.error('Facilitator error', {
      error: error.message || String(error)
    });
    return {
      valid: false,
      error: `Facilitator error: ${error.message}`
    };
  }
}

export function getPaymentRequirements() {
  return [{
    scheme: 'erc3009',
    amount: process.env.PRICE_PER_CHECK || '0.005',
    currency: 'USDC',
    network: process.env.NODE_ENV === 'production' ? 'base' : 'base-sepolia',
    recipient: process.env.PAYMENT_RECIPIENT_ADDRESS || '0x0000000000000000000000000000000000000000',
    metadata: {
      service: 'wallet-screening',
      version: 'v1',
      usdcDecimals: 6
    }
  }];
}
