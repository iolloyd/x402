/**
 * API Key Management Types
 */

export type ApiKeyTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ApiKey {
  key_id: string;           // Unique identifier (e.g., "key_abc123")
  customer_id: string;      // Owner of this key
  name: string;             // Human-readable name/label
  tier: ApiKeyTier;         // Pricing tier
  created_at: string;       // ISO timestamp
  last_used_at: string | null; // Last request timestamp
  usage_count: number;      // Total requests made
  is_active: boolean;       // For revocation
  rate_limits?: {
    requests_per_minute?: number;
    requests_per_day?: number;
  };
  metadata?: Record<string, string>; // Additional custom data
}

export interface ApiKeyWithSecret extends ApiKey {
  api_key: string; // Full key - only returned on creation
}

export interface CreateApiKeyRequest {
  customer_id: string;
  name: string;
  tier?: ApiKeyTier;
  rate_limits?: {
    requests_per_minute?: number;
    requests_per_day?: number;
  };
  metadata?: Record<string, string>;
}

export interface ApiKeyListResponse {
  keys: ApiKey[];
  total: number;
}

export interface ApiKeyUsageStats {
  key_id: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  requests_today: number;
  requests_this_hour: number;
}

// Tier configurations
export const TIER_LIMITS: Record<ApiKeyTier, { rpm: number; rpd: number }> = {
  free: { rpm: 10, rpd: 100 },
  starter: { rpm: 100, rpd: 10000 },
  pro: { rpm: 500, rpd: 100000 },
  enterprise: { rpm: 2000, rpd: 1000000 },
};
