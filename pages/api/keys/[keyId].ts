/**
 * Individual API Key Management
 * GET /api/keys/:keyId - Get key details
 * DELETE /api/keys/:keyId - Revoke/delete key
 */

import type { NextRequest } from 'next/server';
import { getApiKey, deleteApiKey, revokeApiKey } from '@/lib/apikey/storage';
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

  // Extract keyId from URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const keyId = pathParts[pathParts.length - 1];

  if (!keyId) {
    return new Response(
      JSON.stringify({
        error: 'Missing key ID',
        code: 'INVALID_REQUEST',
        correlation_id: correlationId,
      }),
      { status: 400, headers: baseHeaders }
    );
  }

  // GET - Get key details
  if (req.method === 'GET') {
    try {
      const key = await getApiKey(keyId);

      if (!key) {
        return new Response(
          JSON.stringify({
            error: 'API key not found',
            code: 'KEY_NOT_FOUND',
            correlation_id: correlationId,
          }),
          { status: 404, headers: baseHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          ...key,
          correlation_id: correlationId,
        }),
        { status: 200, headers: baseHeaders }
      );
    } catch (error) {
      logger.error('Failed to get API key details', {
        correlation_id: correlationId,
        key_id: keyId,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to get API key',
          code: 'INTERNAL_ERROR',
          correlation_id: correlationId,
        }),
        { status: 500, headers: baseHeaders }
      );
    }
  }

  // DELETE - Delete/revoke key
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url);
      const permanent = url.searchParams.get('permanent') === 'true';

      let success: boolean;
      if (permanent) {
        success = await deleteApiKey(keyId);
      } else {
        success = await revokeApiKey(keyId);
      }

      if (!success) {
        return new Response(
          JSON.stringify({
            error: 'API key not found',
            code: 'KEY_NOT_FOUND',
            correlation_id: correlationId,
          }),
          { status: 404, headers: baseHeaders }
        );
      }

      logger.info('API key deleted/revoked via API', {
        correlation_id: correlationId,
        key_id: keyId,
        permanent,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: permanent ? 'API key deleted permanently' : 'API key revoked',
          key_id: keyId,
          correlation_id: correlationId,
        }),
        { status: 200, headers: baseHeaders }
      );
    } catch (error) {
      logger.error('Failed to delete/revoke API key', {
        correlation_id: correlationId,
        key_id: keyId,
        error: error instanceof Error ? error.message : String(error),
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to delete API key',
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
