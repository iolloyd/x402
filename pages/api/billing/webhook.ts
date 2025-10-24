/**
 * Stripe Webhook Handler
 * Processes billing events from Stripe
 *
 * POST /api/billing/webhook
 */

import type { NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/billing/stripe';
import { updateApiKeyTier } from '@/lib/apikey/storage';
import * as logger from '@/utils/logger';

export const config = {
  runtime: 'nodejs', // Webhooks require Node.js runtime for buffer handling
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook secret not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, webhookSecret);

    logger.info('Stripe webhook received', {
      type: event.type,
      event_id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        logger.debug('Unhandled webhook event type', { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSubscriptionCreated(subscription: any) {
  const customerId = subscription.metadata.customer_id;
  const tier = subscription.metadata.tier;

  logger.info('Subscription created', {
    customer_id: customerId,
    subscription_id: subscription.id,
    tier,
    status: subscription.status,
  });

  // TODO: Update customer record with subscription details
  // This would typically update a customer table in your database
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.metadata.customer_id;
  const tier = subscription.metadata.tier;

  logger.info('Subscription updated', {
    customer_id: customerId,
    subscription_id: subscription.id,
    tier,
    status: subscription.status,
  });

  // If subscription is active, ensure API keys reflect the correct tier
  if (subscription.status === 'active') {
    // TODO: Update all API keys for this customer to the new tier
    // This would query all keys for the customer and update them
  }

  // If subscription is canceled or past_due, downgrade to free tier
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // TODO: Downgrade all API keys to free tier
    logger.warn('Subscription canceled/unpaid - should downgrade customer', {
      customer_id: customerId,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.metadata.customer_id;

  logger.info('Subscription deleted', {
    customer_id: customerId,
    subscription_id: subscription.id,
  });

  // TODO: Downgrade all API keys for this customer to free tier
}

async function handleInvoicePaid(invoice: any) {
  const customerId = invoice.customer;

  logger.info('Invoice paid', {
    invoice_id: invoice.id,
    customer: customerId,
    amount: invoice.amount_paid,
    currency: invoice.currency,
  });

  // TODO: Record successful payment in database
}

async function handleInvoicePaymentFailed(invoice: any) {
  const customerId = invoice.customer;

  logger.warn('Invoice payment failed', {
    invoice_id: invoice.id,
    customer: customerId,
    amount: invoice.amount_due,
    currency: invoice.currency,
  });

  // TODO: Send payment failure notification to customer
  // TODO: Consider suspending API access after multiple failures
}
