/**
 * Billing Portal Session
 * Creates a Stripe billing portal session for customer self-service
 *
 * POST /api/billing/portal
 */

import type { NextRequest } from 'next/server';
import { createBillingPortalSession } from '@/lib/billing/stripe';
import { getOrCreateCorrelationId, addCorrelationHeaders } from '@/utils/correlation';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'nodejs', // Stripe SDK requires Node.js runtime
};

export default async function handler(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...addCorrelationHeaders(correlationId),
  };

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        correlation_id: correlationId,
      }),
      { status: 405, headers: baseHeaders }
    );
  }

  try {
    const body = await req.json();
    const { stripe_customer_id, return_url } = body;

    if (!stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: stripe_customer_id',
          code: 'INVALID_REQUEST',
          correlation_id: correlationId,
        }),
        { status: 400, headers: baseHeaders }
      );
    }

    const defaultReturnUrl = `${req.headers.get('origin') || 'https://clearwallet.com'}/dashboard`;
    const portalUrl = await createBillingPortalSession(
      stripe_customer_id,
      return_url || defaultReturnUrl
    );

    logger.info('Billing portal session created', {
      correlation_id: correlationId,
      stripe_customer_id,
    });

    return new Response(
      JSON.stringify({
        url: portalUrl,
        correlation_id: correlationId,
      }),
      { status: 200, headers: baseHeaders }
    );
  } catch (error) {
    logger.error('Failed to create billing portal session', {
      correlation_id: correlationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: 'Failed to create billing portal session',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      }),
      { status: 500, headers: baseHeaders }
    );
  }
}
