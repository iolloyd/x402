import { ethers } from 'ethers';
import { X402PaymentPayload } from './types';
import * as logger from '@/utils/logger';
import { useFacilitator } from 'x402/verify';
import type { PaymentPayload, PaymentRequirements, VerifyResponse } from 'x402/types';
import { createFacilitatorConfig } from '@coinbase/x402';

// USDC contract addresses for different networks
const USDC_CONTRACTS: Record<string, string> = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

/**
 * Validates an x402 payment using the Coinbase facilitator service
 *
 * @param paymentHeader - Base64-encoded payment payload from X-PAYMENT header
 * @param expectedAmount - Expected payment amount in USDC (e.g., "0.005")
 * @returns Promise<boolean> - true if payment is valid, false otherwise
 */
export async function validateX402Payment(
  paymentHeader: string,
  expectedAmount: string
): Promise<boolean> {
  try {
    // Decode base64 payment header
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
    const paymentPayload: PaymentPayload = JSON.parse(decoded);

    logger.info('X402 payment received', {
      version: paymentPayload.x402Version,
      scheme: paymentPayload.scheme,
      network: paymentPayload.network
    });

    // Validate payment structure
    if (paymentPayload.x402Version !== 1) {
      logger.warn('Unsupported x402 version', { version: paymentPayload.x402Version });
      return false;
    }

    if (paymentPayload.scheme !== 'exact') {
      logger.warn('Unsupported payment scheme', { scheme: paymentPayload.scheme });
      return false;
    }

    // Get configuration from environment
    const recipientAddress = process.env.PAYMENT_RECIPIENT_ADDRESS;
    if (!recipientAddress) {
      logger.error('Payment recipient address not configured');
      return false;
    }

    const network = paymentPayload.network;

    // Get USDC contract address for the network
    const usdcAddress = USDC_CONTRACTS[network];
    if (!usdcAddress) {
      logger.warn('Unsupported network', { network });
      return false;
    }

    // Create payment requirements
    const paymentRequirements: PaymentRequirements = {
      scheme: 'exact',
      network: network as any,
      maxAmountRequired: ethers.parseUnits(expectedAmount, 6).toString(),
      resource: 'https://wallet-screening.x402.org/api/screen',
      description: 'Wallet screening API access',
      mimeType: 'application/json',
      payTo: recipientAddress,
      maxTimeoutSeconds: 300,
      asset: usdcAddress,
    };

    // Use the facilitator to verify the payment
    const cdpApiKeyId = process.env.CDP_API_KEY_ID;
    const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;

    if (!cdpApiKeyId || !cdpApiKeySecret) {
      logger.error('CDP API credentials not configured for payment verification');
      return false;
    }

    // Create facilitator config with CDP credentials
    const facilitatorConfig = createFacilitatorConfig(cdpApiKeyId, cdpApiKeySecret);
    const facilitatorClient = useFacilitator(facilitatorConfig);

    // Verify the payment using the facilitator
    const verificationResult: VerifyResponse = await facilitatorClient.verify(
      paymentPayload,
      paymentRequirements
    );

    if (verificationResult.isValid) {
      logger.info('X402 payment validated successfully via facilitator', {
        payer: verificationResult.payer,
        network: paymentPayload.network
      });
      return true;
    } else {
      logger.warn('X402 payment verification failed', {
        error: verificationResult.invalidReason,
        network: paymentPayload.network
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

/**
 * Creates x402 payment requirements for the wallet screening API
 *
 * @param resource - Optional resource URL override
 * @returns PaymentRequirements object for x402 protocol
 */
export function getPaymentRequirements(resource?: string): PaymentRequirements {
  const recipientAddress = process.env.PAYMENT_RECIPIENT_ADDRESS;
  if (!recipientAddress) {
    throw new Error('PAYMENT_RECIPIENT_ADDRESS environment variable is required');
  }

  const pricePerCheck = process.env.PRICE_PER_CHECK || '0.005';
  const isProduction = process.env.NODE_ENV === 'production';
  const network = isProduction ? 'base' : 'base-sepolia';
  const usdcAddress = USDC_CONTRACTS[network];

  if (!usdcAddress) {
    throw new Error(`USDC contract address not found for network: ${network}`);
  }

  return {
    scheme: 'exact',
    network: network as any,
    maxAmountRequired: ethers.parseUnits(pricePerCheck, 6).toString(),
    resource: resource || 'https://wallet-screening.x402.org/api/screen',
    description: 'Screen cryptocurrency addresses against OFAC sanctions lists',
    mimeType: 'application/json',
    payTo: recipientAddress,
    maxTimeoutSeconds: 300,
    asset: usdcAddress,
    extra: {
      service: 'wallet-screening',
      version: 'v1',
      usdcDecimals: 6
    }
  };
}
