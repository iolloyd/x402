/**
 * Centralized environment variable validator for x402
 * Edge runtime compatible - no external dependencies
 */

export interface EnvironmentValidationResult {
  status: 'ok' | 'error';
  missing: string[];
  invalid: string[];
  production: boolean;
}

export interface DataSourceValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}

/**
 * Validates Ethereum address format (0x + 40 hex characters)
 */
function isValidEthereumAddress(address: string): boolean {
  if (typeof address !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates URL format and checks if it starts with https://
 */
function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates all required environment variables
 * @returns Validation result with status, missing variables, and production flag
 */
export function validateEnvironment(): EnvironmentValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Required variables
  const requiredVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'PAYMENT_RECIPIENT_ADDRESS',
    'NODE_ENV',
  ];

  // Check if required variables exist
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  // Validate format of existing variables
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (redisUrl && !isValidHttpsUrl(redisUrl)) {
    invalid.push('UPSTASH_REDIS_REST_URL (must be a valid HTTPS URL)');
  }

  const paymentAddress = process.env.PAYMENT_RECIPIENT_ADDRESS;
  if (paymentAddress && !isValidEthereumAddress(paymentAddress)) {
    invalid.push('PAYMENT_RECIPIENT_ADDRESS (must be a valid Ethereum address: 0x + 40 hex chars)');
  }

  const nodeEnv = process.env.NODE_ENV;
  const production = nodeEnv === 'production';

  // Determine overall status
  const status = missing.length === 0 && invalid.length === 0 ? 'ok' : 'error';

  return {
    status,
    missing,
    invalid,
    production,
  };
}

/**
 * Verifies that a data source URL is valid and points to the expected GitHub repository
 * @param url - The URL to validate
 * @returns Validation result with valid flag and optional error message
 */
export function verifyDataSource(url: string): DataSourceValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'URL is required and must be a string',
    };
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (parsedUrl.protocol !== 'https:') {
      return {
        valid: false,
        url,
        error: 'URL must use HTTPS protocol',
      };
    }

    // Check hostname
    if (parsedUrl.hostname !== 'raw.githubusercontent.com') {
      return {
        valid: false,
        url,
        error: 'URL must point to raw.githubusercontent.com',
      };
    }

    // Check path starts with /0xB10C/
    if (!parsedUrl.pathname.startsWith('/0xB10C/')) {
      return {
        valid: false,
        url,
        error: 'URL must point to 0xB10C repository',
      };
    }

    return {
      valid: true,
      url,
    };
  } catch (error) {
    return {
      valid: false,
      url,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Checks optional but recommended environment variables
 * @returns Array of warnings for missing optional variables
 */
export function checkOptionalVariables(): string[] {
  const warnings: string[] = [];

  if (!process.env.OFAC_SYNC_API_KEY) {
    warnings.push('OFAC_SYNC_API_KEY is not set (recommended for production)');
  }

  return warnings;
}

/**
 * Performs a complete environment validation check
 * Logs results and throws error if validation fails
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();

  if (result.status === 'error') {
    const errors: string[] = [];

    if (result.missing.length > 0) {
      errors.push(`Missing required variables: ${result.missing.join(', ')}`);
    }

    if (result.invalid.length > 0) {
      errors.push(`Invalid variables: ${result.invalid.join(', ')}`);
    }

    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  // Check optional variables in production
  if (result.production) {
    const warnings = checkOptionalVariables();
    if (warnings.length > 0) {
      console.warn('Environment warnings:', warnings.join('\n'));
    }
  }
}
