import { paymentMiddleware } from 'x402-next';
import { facilitator } from '@coinbase/x402';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Environment variables
const PAYMENT_RECIPIENT_ADDRESS = process.env.PAYMENT_RECIPIENT_ADDRESS;
const CDP_CLIENT_KEY = process.env.CDP_CLIENT_KEY;
const PRICE_PER_CHECK = process.env.PRICE_PER_CHECK || '0.005';

if (!PAYMENT_RECIPIENT_ADDRESS) {
  throw new Error('PAYMENT_RECIPIENT_ADDRESS environment variable is required');
}

// Create the payment middleware
const x402Middleware = paymentMiddleware(
  PAYMENT_RECIPIENT_ADDRESS as `0x${string}`,
  {
    // Wallet screening endpoint
    '/api/screen/:chain/:address': {
      price: `$${PRICE_PER_CHECK}`,
      network: 'base',
      config: {
        discoverable: true,
        description: 'Screen cryptocurrency addresses against OFAC sanctions lists. Returns risk assessment including sanctioned status, risk level, and flags. The endpoint accepts two path parameters: chain (ethereum or base) and address (0x-prefixed hex address).',
      },
    },
    // Session token endpoint for Coinbase onramp integration
    '/api/x402/session-token': {
      price: '$0',
      network: 'base',
      config: {
        discoverable: false,
        description: 'Generate session token for Coinbase onramp integration',
      },
    },
  },
  facilitator,
  {
    ...(CDP_CLIENT_KEY && { cdpClientKey: CDP_CLIENT_KEY }),
    sessionTokenEndpoint: '/api/x402/session-token',
  }
);

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/pricing'];
const AUTH_ROUTES = ['/login', '/signup'];

// Wrapper to conditionally apply middleware based on path
export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Update Supabase session for all routes
  const response = await updateSession(request);

  // Check if user is accessing protected route
  if (PROTECTED_ROUTES.some(route => path.startsWith(route))) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return response;
    }

    // Check if user is authenticated by checking for session cookie
    const sessionCookie = request.cookies.get('sb-access-token');

    if (!sessionCookie) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some(route => path.startsWith(route))) {
    const sessionCookie = request.cookies.get('sb-access-token');

    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Apply x402 middleware to payment-protected routes
  if (path.startsWith('/api/screen/') || path === '/api/x402/session-token') {
    return x402Middleware(request);
  }

  // Let all other requests pass through
  return response;
}

// Configure matcher to apply middleware to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
  runtime: 'nodejs', // Temporary until Edge runtime support is added
};
