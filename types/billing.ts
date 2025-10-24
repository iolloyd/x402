/**
 * Billing and Subscription Types
 */

import { ApiKeyTier } from './apikey';

export interface StripeCustomer {
  customer_id: string;        // Our internal customer ID
  stripe_customer_id: string; // Stripe customer ID
  email: string;
  name?: string;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface Subscription {
  subscription_id: string;     // Stripe subscription ID
  customer_id: string;         // Our internal customer ID
  stripe_customer_id: string;  // Stripe customer ID
  tier: ApiKeyTier;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface UsageRecord {
  customer_id: string;
  api_key_id: string;
  usage_count: number;
  period_start: string;
  period_end: string;
  reported_at: string;
}

export interface Invoice {
  invoice_id: string;           // Stripe invoice ID
  customer_id: string;
  stripe_customer_id: string;
  amount_due: number;           // In cents
  amount_paid: number;          // In cents
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  period_start: string;
  period_end: string;
  created_at: string;
  paid_at?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

// Stripe Price IDs for each tier
export const STRIPE_PRICE_IDS: Record<ApiKeyTier, string> = {
  free: '', // No Stripe subscription for free tier
  starter: process.env.STRIPE_PRICE_ID_STARTER || '',
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
};

// Tier pricing (monthly, in dollars)
export const TIER_PRICING: Record<ApiKeyTier, number> = {
  free: 0,
  starter: 99,
  pro: 499,
  enterprise: 2999,
};

// Usage-based pricing (per 1000 requests over tier limit)
export const OVERAGE_PRICING: Record<ApiKeyTier, number> = {
  free: 0, // No overage for free tier
  starter: 5, // $5 per 1000 requests
  pro: 3, // $3 per 1000 requests
  enterprise: 1, // $1 per 1000 requests
};
