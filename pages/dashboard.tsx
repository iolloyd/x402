import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface ApiKey {
  key_id: string;
  name: string;
  tier: string;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  rate_limits?: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedTier, setSelectedTier] = useState('free');
  const [createdKey, setCreatedKey] = useState<{ api_key: string; key_id: string } | null>(null);

  const fetchApiKeys = async () => {
    if (!customerId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/keys?customer_id=${encodeURIComponent(customerId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch API keys');
      }

      setApiKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!customerId || !newKeyName) {
      setError('Customer ID and key name are required');
      return;
    }

    setLoading(true);
    setError('');
    setCreatedKey(null);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          name: newKeyName,
          tier: selectedTier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      setCreatedKey({ api_key: data.api_key, key_id: data.key_id });
      setNewKeyName('');
      fetchApiKeys(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete API key');
      }

      fetchApiKeys(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  useEffect(() => {
    // Try to get customer_id from query params
    const { customer_id } = router.query;
    if (customer_id && typeof customer_id === 'string') {
      setCustomerId(customer_id);
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Dashboard - ClearWallet</title>
        <meta name="description" content="Manage your ClearWallet API keys" />
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <h1>ClearWallet Dashboard</h1>

        {/* Customer ID Input */}
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Customer ID:
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter your customer ID"
              style={{ marginLeft: '10px', padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
          <button
            onClick={fetchApiKeys}
            disabled={!customerId || loading}
            style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Loading...' : 'Load API Keys'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '15px', backgroundColor: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Create New API Key */}
        {customerId && (
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Create New API Key</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="API Key Name"
                style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <button
                onClick={createApiKey}
                disabled={!newKeyName || loading}
                style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Create Key
              </button>
            </div>
          </div>
        )}

        {/* Show newly created key */}
        {createdKey && (
          <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '8px', marginBottom: '20px', border: '2px solid #0070f3' }}>
            <h3 style={{ marginTop: 0, color: '#0070f3' }}>⚠️ API Key Created - Save This Now!</h3>
            <p style={{ margin: '10px 0' }}>This is the only time you'll see the full API key:</p>
            <code style={{ display: 'block', padding: '15px', backgroundColor: 'white', borderRadius: '4px', marginBottom: '10px', wordBreak: 'break-all' }}>
              {createdKey.api_key}
            </code>
            <p style={{ fontSize: '14px', color: '#666' }}>Key ID: {createdKey.key_id}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKey.api_key);
                alert('API key copied to clipboard!');
              }}
              style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        {/* API Keys List */}
        {apiKeys.length > 0 && (
          <div>
            <h2>Your API Keys ({apiKeys.length})</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {apiKeys.map((key) => (
                <div
                  key={key.key_id}
                  style={{
                    padding: '20px',
                    backgroundColor: key.is_active ? 'white' : '#f5f5f5',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0' }}>
                        {key.name}
                        {!key.is_active && <span style={{ color: '#999', marginLeft: '10px' }}>(Inactive)</span>}
                      </h3>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        <p style={{ margin: '5px 0' }}>
                          <strong>Key ID:</strong> <code>{key.key_id}</code>
                        </p>
                        <p style={{ margin: '5px 0' }}>
                          <strong>Tier:</strong> <span style={{ textTransform: 'capitalize' }}>{key.tier}</span>
                        </p>
                        <p style={{ margin: '5px 0' }}>
                          <strong>Usage:</strong> {key.usage_count.toLocaleString()} requests
                        </p>
                        {key.rate_limits && (
                          <p style={{ margin: '5px 0' }}>
                            <strong>Limits:</strong> {key.rate_limits.requests_per_minute} RPM, {key.rate_limits.requests_per_day.toLocaleString()} RPD
                          </p>
                        )}
                        <p style={{ margin: '5px 0' }}>
                          <strong>Created:</strong> {new Date(key.created_at).toLocaleString()}
                        </p>
                        {key.last_used_at && (
                          <p style={{ margin: '5px 0' }}>
                            <strong>Last Used:</strong> {new Date(key.last_used_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {key.is_active && (
                      <button
                        onClick={() => deleteApiKey(key.key_id)}
                        style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation Links */}
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3>Resources</h3>
          <ul>
            <li><a href="/docs" target="_blank" style={{ color: '#0070f3' }}>API Documentation</a></li>
            <li><a href="/openapi.yaml" target="_blank" style={{ color: '#0070f3' }}>OpenAPI Specification</a></li>
            <li><a href="https://clearwallet.com/support" target="_blank" style={{ color: '#0070f3' }}>Support</a></li>
          </ul>
        </div>
      </div>
    </>
  );
}
