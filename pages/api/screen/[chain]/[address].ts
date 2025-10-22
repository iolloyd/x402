import type { NextRequest } from 'next/server';
import { isValidChain, normalizeChain, SupportedChain, SUPPORTED_CHAINS } from '@/types/chains';
import { ScreeningResult } from '@/types/api';
import { validateAddress } from '@/utils/validation';
import {
  InvalidAddressError,
  UnsupportedChainError,
  RateLimitError,
  PaymentRequiredError,
  handleError,
} from '@/utils/errors';
import { isAddressSanctioned } from '@/lib/ofac/checker';
import { assessRiskLevel, getRiskFlags } from '@/lib/risk/assessor';
import { ScreeningCache } from '@/lib/cache/strategies';
import { checkRateLimit, getClientIdentifier } from '@/lib/ratelimit/limiter';
import { validateX402Payment, getPaymentRequirements } from '@/lib/x402/validator';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  // Generate correlation ID for request tracking and audit trail
  const correlationId = getOrCreateCorrelationId(req);

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        correlation_id: correlationId
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...addCorrelationHeaders(correlationId),
        },
      }
    );
  }

  try {
    // Extract parameters from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const chain = pathParts[pathParts.length - 2];
    const address = pathParts[pathParts.length - 1];

    // Validate chain
    if (!isValidChain(chain)) {
      throw new UnsupportedChainError(
        chain,
        SUPPORTED_CHAINS.map(c => c.toString())
      );
    }

    const normalizedChain = normalizeChain(chain) as SupportedChain;

    // Validate address
    const validation = validateAddress(normalizedChain, address);
    if (!validation.valid) {
      throw new InvalidAddressError(address, normalizedChain);
    }

    const normalizedAddress = validation.normalized!;

    // Check for X402 payment header
    const paymentHeader = req.headers.get('x-payment');
    const hasPaidAccess = paymentHeader ? await validateX402Payment(
      paymentHeader,
      process.env.PRICE_PER_CHECK || '0.005'
    ) : false;

    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      clientId,
      hasPaidAccess ? 'paid' : 'free'
    );

    if (!rateLimitResult.success) {
      throw new RateLimitError(Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
    }

    // For free tier without payment, return 402 after rate limit check passes
    if (!hasPaidAccess) {
      throw new PaymentRequiredError({
        paymentRequirements: getPaymentRequirements()
      });
    }

    // Check cache first
    const cache = new ScreeningCache();
    const cachedResult = await cache.get(normalizedChain, normalizedAddress);

    if (cachedResult) {
      logger.info('Screening request - cache hit', {
        correlation_id: correlationId,
        chain: normalizedChain,
        address: normalizedAddress,
        sanctioned: cachedResult.sanctioned
      });

      // Update cache_hit flag and correlation_id, then return
      return new Response(
        JSON.stringify({
          ...cachedResult,
          cache_hit: true,
          correlation_id: correlationId
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            ...addCorrelationHeaders(correlationId),
          },
        }
      );
    }

    // Perform OFAC check
    const ofacResult = await isAddressSanctioned(normalizedChain, normalizedAddress);

    // Assess risk level
    const riskLevel = assessRiskLevel({
      ofacSanctioned: ofacResult.sanctioned,
    });

    const flags = getRiskFlags({
      ofacSanctioned: ofacResult.sanctioned,
    });

    // Build response
    const result: ScreeningResult = {
      address: normalizedAddress,
      chain: normalizedChain,
      sanctioned: ofacResult.sanctioned,
      risk_level: riskLevel,
      flags,
      checked_at: new Date().toISOString(),
      sources: ['ofac_github'],
      cache_hit: false,
      correlation_id: correlationId,
      ...(ofacResult.sanctioned && ofacResult.details ? { details: ofacResult.details } : {}),
    };

    // Cache the result
    await cache.set(normalizedChain, normalizedAddress, result);

    logger.info('Screening request - completed', {
      correlation_id: correlationId,
      chain: normalizedChain,
      address: normalizedAddress,
      sanctioned: result.sanctioned,
      risk_level: result.risk_level
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        ...addCorrelationHeaders(correlationId),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
