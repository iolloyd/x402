/**
 * Batch Screening Endpoint
 * POST /api/screen/batch
 *
 * Enterprise feature for screening multiple addresses in a single request
 * Requires API key authentication
 */

import type { NextRequest } from 'next/server';
import { isValidChain, normalizeChain, SupportedChain } from '@/types/chains';
import { ScreeningResult } from '@/types/api';
import { validateAddress } from '@/utils/validation';
import {
  RateLimitError,
  handleError,
} from '@/utils/errors';
import { isAddressSanctioned } from '@/lib/ofac/checker';
import { assessRiskLevel, getRiskFlags } from '@/lib/risk/assessor';
import { ScreeningCache } from '@/lib/cache/strategies';
import { checkApiKeyRateLimit } from '@/lib/ratelimit/limiter';
import { lookupApiKey, updateApiKeyUsage } from '@/lib/apikey/storage';
import { isValidApiKeyFormat } from '@/lib/apikey/generator';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'edge',
};

interface BatchScreeningRequest {
  addresses: Array<{
    chain: string;
    address: string;
  }>;
}

interface BatchScreeningResponse {
  correlation_id: string;
  total: number;
  successful: number;
  failed: number;
  results: Array<ScreeningResult | { error: string; chain: string; address: string }>;
  processing_time_ms: number;
}

const MAX_BATCH_SIZE = 1000; // Enterprise customers can screen up to 1000 addresses per request

export default async function handler(req: NextRequest) {
  const startTime = Date.now();
  const correlationId = getOrCreateCorrelationId(req);
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...addCorrelationHeaders(correlationId),
  };

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed. Use POST.',
        code: 'METHOD_NOT_ALLOWED',
        correlation_id: correlationId,
      }),
      { status: 405, headers: baseHeaders }
    );
  }

  try {
    // Batch screening requires API key authentication
    const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKeyHeader || !isValidApiKeyFormat(apiKeyHeader)) {
      return new Response(
        JSON.stringify({
          error: 'Batch screening requires API key authentication',
          code: 'API_KEY_REQUIRED',
          correlation_id: correlationId,
          message: 'Include your API key in X-API-Key header or Authorization: Bearer header',
        }),
        { status: 401, headers: baseHeaders }
      );
    }

    const apiKey = await lookupApiKey(apiKeyHeader);

    if (!apiKey || !apiKey.is_active) {
      return new Response(
        JSON.stringify({
          error: apiKey ? 'API key is inactive' : 'Invalid API key',
          code: 'INVALID_API_KEY',
          correlation_id: correlationId,
        }),
        { status: 401, headers: baseHeaders }
      );
    }

    logger.info('Batch screening request started', {
      correlation_id: correlationId,
      key_id: apiKey.key_id,
      tier: apiKey.tier,
    });

    // Rate limiting for API key
    const rateLimitResult = await checkApiKeyRateLimit(apiKey);

    if (!rateLimitResult.success) {
      throw new RateLimitError(Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
    }

    // Parse request body
    const body: BatchScreeningRequest = await req.json();

    if (!body.addresses || !Array.isArray(body.addresses) || body.addresses.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: addresses array is required',
          code: 'INVALID_REQUEST',
          correlation_id: correlationId,
        }),
        { status: 400, headers: baseHeaders }
      );
    }

    if (body.addresses.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} addresses`,
          code: 'BATCH_TOO_LARGE',
          correlation_id: correlationId,
          max_batch_size: MAX_BATCH_SIZE,
          requested: body.addresses.length,
        }),
        { status: 400, headers: baseHeaders }
      );
    }

    // Process all addresses
    const cache = new ScreeningCache();
    const results: Array<ScreeningResult | { error: string; chain: string; address: string }> = [];
    let successful = 0;
    let failed = 0;

    // Process in parallel with Promise.all for performance
    const screeningPromises = body.addresses.map(async (item) => {
      try {
        // Validate chain
        if (!isValidChain(item.chain)) {
          return {
            error: 'Unsupported chain',
            chain: item.chain,
            address: item.address,
          };
        }

        const normalizedChain = normalizeChain(item.chain) as SupportedChain;

        // Validate address
        const validation = validateAddress(normalizedChain, item.address);
        if (!validation.valid) {
          return {
            error: 'Invalid address format',
            chain: normalizedChain,
            address: item.address,
          };
        }

        const normalizedAddress = validation.normalized!;

        // Check cache first
        const cachedResult = await cache.get(normalizedChain, normalizedAddress);

        if (cachedResult) {
          return {
            ...cachedResult,
            cache_hit: true,
            correlation_id: correlationId,
          };
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

        // Cache the result (fire and forget)
        cache.set(normalizedChain, normalizedAddress, result).catch(err => {
          logger.error('Failed to cache batch screening result', {
            error: err instanceof Error ? err.message : String(err),
          });
        });

        return result;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Screening failed',
          chain: item.chain,
          address: item.address,
        };
      }
    });

    const screeningResults = await Promise.all(screeningPromises);

    // Count successes and failures
    screeningResults.forEach(result => {
      if ('sanctioned' in result) {
        successful++;
      } else {
        failed++;
      }
      results.push(result);
    });

    // Update API key usage (count as 1 request, not per-address)
    await updateApiKeyUsage(apiKey.key_id);

    const processingTime = Date.now() - startTime;

    logger.info('Batch screening request completed', {
      correlation_id: correlationId,
      key_id: apiKey.key_id,
      tier: apiKey.tier,
      total: body.addresses.length,
      successful,
      failed,
      processing_time_ms: processingTime,
    });

    const response: BatchScreeningResponse = {
      correlation_id: correlationId,
      total: body.addresses.length,
      successful,
      failed,
      results,
      processing_time_ms: processingTime,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...baseHeaders,
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Batch screening request failed', {
      correlation_id: correlationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return handleError(error);
  }
}
