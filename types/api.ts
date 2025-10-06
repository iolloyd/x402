import { SupportedChain } from './chains';

export type RiskLevel = 'clear' | 'low' | 'medium' | 'high';

export interface ScreeningResult {
  address: string;
  chain: SupportedChain;
  sanctioned: boolean;
  risk_level: RiskLevel;
  flags: string[];
  checked_at: string;
  sources: string[];
  cache_hit: boolean;
  details?: {
    list?: string;
    entity_name?: string;
    added_date?: string;
  };
}

export interface ErrorResponse {
  error: string;
  code: string;
  chain?: string;
  address?: string;
  supported_chains?: string[];
  retry_after?: number;
  payment_details?: PaymentDetails;
}

export interface PaymentDetails {
  amount: string;
  currency: string;
  recipient: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    redis: boolean;
    ofac_data: boolean;
    config: boolean;
  };
  data_freshness?: {
    fresh: boolean;
    age_hours: number;
    last_sync: string | null;
    ttl_remaining: number;
  };
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}
