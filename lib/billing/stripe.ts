/**
 * Stripe Integration
 * Handles customer creation, subscription management, and billing
 *
 * Note: Requires stripe package to be installed
 * npm install stripe
 */

import { ApiKeyTier } from '@/types/apikey';
import {
  StripeCustomer,
  Subscription,
  STRIPE_PRICE_IDS,
  TIER_PRICING
} from '@/types/billing';
import * as logger from '@/utils/logger';

// Type-only import to avoid runtime errors if stripe not installed yet
type Stripe = any;
type StripeModule = any;

let stripe: Stripe | null = null;

/**
 * Initialize Stripe client
 */
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable not set');
    }

    // Dynamic import to avoid errors if stripe not installed
    try {
      const StripeModule = require('stripe');
      stripe = new StripeModule(apiKey, {
        apiVersion: '2023-10-16' as any,
      });
    } catch (error) {
      logger.error('Failed to initialize Stripe', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Stripe not available. Run: npm install stripe');
    }
  }

  return stripe;
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(
  customerId: string,
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<StripeCustomer> {
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        customer_id: customerId,
        ...metadata,
      },
    });

    logger.info('Stripe customer created', {
      customer_id: customerId,
      stripe_customer_id: customer.id,
    });

    return {
      customer_id: customerId,
      stripe_customer_id: customer.id,
      email,
      name,
      created_at: new Date(customer.created * 1000).toISOString(),
      metadata,
    };
  } catch (error) {
    logger.error('Failed to create Stripe customer', {
      customer_id: customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create a subscription for a customer
 */
export async function createSubscription(
  customerId: string,
  stripeCustomerId: string,
  tier: ApiKeyTier
): Promise<Subscription> {
  const stripe = getStripe();

  if (tier === 'free') {
    throw new Error('Cannot create subscription for free tier');
  }

  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for tier: ${tier}`);
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      metadata: {
        customer_id: customerId,
        tier,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    logger.info('Subscription created', {
      customer_id: customerId,
      subscription_id: subscription.id,
      tier,
    });

    return {
      subscription_id: subscription.id,
      customer_id: customerId,
      stripe_customer_id: stripeCustomerId,
      tier,
      status: subscription.status as any,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      created_at: new Date(subscription.created * 1000).toISOString(),
    };
  } catch (error) {
    logger.error('Failed to create subscription', {
      customer_id: customerId,
      tier,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<void> {
  const stripe = getStripe();

  try {
    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
      logger.info('Subscription canceled immediately', { subscription_id: subscriptionId });
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      logger.info('Subscription set to cancel at period end', { subscription_id: subscriptionId });
    }
  } catch (error) {
    logger.error('Failed to cancel subscription', {
      subscription_id: subscriptionId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Update subscription tier
 */
export async function updateSubscriptionTier(
  subscriptionId: string,
  newTier: ApiKeyTier
): Promise<Subscription> {
  const stripe = getStripe();

  if (newTier === 'free') {
    throw new Error('Cannot downgrade to free tier via subscription update. Cancel subscription instead.');
  }

  const priceId = STRIPE_PRICE_IDS[newTier];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for tier: ${newTier}`);
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: currentItem.id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
      metadata: {
        ...subscription.metadata,
        tier: newTier,
      },
    });

    logger.info('Subscription tier updated', {
      subscription_id: subscriptionId,
      new_tier: newTier,
    });

    return {
      subscription_id: updated.id,
      customer_id: updated.metadata.customer_id,
      stripe_customer_id: updated.customer as string,
      tier: newTier,
      status: updated.status as any,
      current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
      current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      cancel_at_period_end: updated.cancel_at_period_end,
      created_at: new Date(updated.created * 1000).toISOString(),
    };
  } catch (error) {
    logger.error('Failed to update subscription tier', {
      subscription_id: subscriptionId,
      new_tier: newTier,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Report usage for metered billing
 */
export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
): Promise<void> {
  const stripe = getStripe();

  try {
    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });

    logger.debug('Usage reported to Stripe', {
      subscription_item_id: subscriptionItemId,
      quantity,
    });
  } catch (error) {
    logger.error('Failed to report usage to Stripe', {
      subscription_item_id: subscriptionItemId,
      quantity,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - usage reporting failure shouldn't block operations
  }
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(
  stripeCustomerId: string,
  limit: number = 10
): Promise<any[]> {
  const stripe = getStripe();

  try {
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    logger.error('Failed to fetch customer invoices', {
      stripe_customer_id: stripeCustomerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Create a billing portal session for customer self-service
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    logger.error('Failed to create billing portal session', {
      stripe_customer_id: stripeCustomerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): any {
  const stripe = getStripe();

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
