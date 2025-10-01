import React from 'react';

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
        See the <a href="https://github.com" target="_blank">GitHub repository</a> for complete API documentation.
      </p>
    </div>
  );
}
