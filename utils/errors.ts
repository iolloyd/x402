import { ErrorResponse } from '@/types/api';

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIError';
  }

  toJSON(): ErrorResponse {
    return {
      error: this.message,
      code: this.code,
      ...this.metadata,
    };
  }
}

export class InvalidAddressError extends APIError {
  constructor(address: string, chain?: string) {
    super('INVALID_ADDRESS', 'Invalid address format', 400, { address, chain });
  }
}

export class UnsupportedChainError extends APIError {
  constructor(chain: string, supportedChains: string[]) {
    super('UNSUPPORTED_CHAIN', 'Chain not supported', 400, {
      chain,
      supported_chains: supportedChains,
    });
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, {
      retry_after: retryAfter,
    });
  }
}

export class PaymentRequiredError extends APIError {
  constructor(paymentDetails: any) {
    super('PAYMENT_REQUIRED', 'Payment required', 402, {
      payment_details: paymentDetails,
    });
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(message: string = 'Service temporarily unavailable') {
    super('SERVICE_UNAVAILABLE', message, 503);
  }
}

export function handleError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Unknown error
  const errorResponse: ErrorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
