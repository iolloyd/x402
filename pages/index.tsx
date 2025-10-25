import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      <h1>X402 Wallet Screening API</h1>
      <p>
        Agent-optimized API for screening cryptocurrency addresses against OFAC sanctions lists.
      </p>

      <div style={{ marginTop: '20px', marginBottom: '40px', display: 'flex', gap: '10px' }}>
        <Link href="/signup" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          Get Started Free
        </Link>
        <Link href="/docs" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#f5f5f5',
          color: '#333',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '500'
        }}>
          View Docs
        </Link>
      </div>

      <h2>API Endpoints</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Health Check</h3>
        <code style={{
          display: 'block',
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px'
        }}>
          GET /api/health
        </code>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Screen Address</h3>
        <code style={{
          display: 'block',
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px'
        }}>
          GET /api/screen/:chain/:address
        </code>
        <p>
          <strong>Supported chains:</strong> ethereum, base
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Sync OFAC Data</h3>
        <code style={{
          display: 'block',
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px'
        }}>
          POST /api/data/sync-ofac
        </code>
        <p>
          <strong>Requires:</strong> Authorization header with Bearer token
        </p>
      </div>

      <h2>Features</h2>
      <ul>
        <li>Sub-second response times via Vercel Edge Functions</li>
        <li>Real-time OFAC sanctions screening</li>
        <li>Multi-layer caching with Redis</li>
        <li>Rate limiting (free and paid tiers)</li>
        <li>X402 payment integration</li>
      </ul>

      <h2>Documentation</h2>
      <p>
        See the <a href="/docs" style={{ color: '#0070f3' }}>API Documentation</a> for complete details.
      </p>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
        <h3>Ready to get started?</h3>
        <Link href="/signup" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '500',
          marginTop: '10px'
        }}>
          Create Free Account
        </Link>
      </div>
    </div>
  );
}
