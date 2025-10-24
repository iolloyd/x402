/**
 * API Key Management Endpoints
 * POST /api/keys - Create new API key
 * GET /api/keys?customer_id=xxx - List customer's API keys
 */

import type { NextRequest } from 'next/server';
import { createApiKey, listApiKeys } from '@/lib/apikey/storage';
import { maskApiKey } from '@/lib/apikey/generator';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...addCorrelationHeaders(correlationId),
  };

  // POST - Create new API key
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Validate required fields
      if (!body.customer_id || !body.name) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: customer_id, name',
            code: 'INVALID_REQUEST',
            correlation_id: correlationId,
          }),
          { status: 400, headers: baseHeaders }
        );
      }

      // Create the API key
      const apiKeyWithSecret = await createApiKey({
        customer_id: body.customer_id,
        name: body.name,
        tier: body.tier || 'free',
        rate_limits: body.rate_limits,
        metadata: body.metadata,
      });

      logger.info('API key created via API', {
        correlation_id: correlationId,
        key_id: apiKeyWithSecret.key_id,
        customer_id: body.customer_id,
        tier: apiKeyWithSecret.tier,
      });

      return new Response(
        JSON.stringify({
          ...apiKeyWithSecret,
          api_key: apiKeyWithSecret.api_key, // Full key only on creation
          api_key_masked: maskApiKey(apiKeyWithSecret.api_key),
          correlation_id: correlationId,
          message: 'API key created successfully. Save the api_key securely - it will not be shown again.',
        }),
        { status: 201, headers: baseHeaders }
      );
    } catch (error) {
      logger.error('Failed to create API key via API', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to create API key',
          code: 'INTERNAL_ERROR',
          correlation_id: correlationId,
        }),
        { status: 500, headers: baseHeaders }
      );
    }
  }

  // GET - List API keys
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const customerId = url.searchParams.get('customer_id');

      if (!customerId) {
        return new Response(
          JSON.stringify({
            error: 'Missing required parameter: customer_id',
            code: 'INVALID_REQUEST',
            correlation_id: correlationId,
          }),
          { status: 400, headers: baseHeaders }
        );
      }

      const keys = await listApiKeys(customerId);

      // Remove sensitive data and mask keys
      const safeKeys = keys.map(key => ({
        ...key,
        // Don't include the actual API key
      }));

      return new Response(
        JSON.stringify({
          keys: safeKeys,
          total: safeKeys.length,
          correlation_id: correlationId,
        }),
        { status: 200, headers: baseHeaders }
      );
    } catch (error) {
      logger.error('Failed to list API keys via API', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to list API keys',
          code: 'INTERNAL_ERROR',
          correlation_id: correlationId,
        }),
        { status: 500, headers: baseHeaders }
      );
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      correlation_id: correlationId,
    }),
    { status: 405, headers: baseHeaders }
  );
}
