import { useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase/client';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        setMessage('Account created! Please check your email to verify your account.');

        // If email confirmation is disabled, redirect to dashboard
        if (data.session) {
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up - ClearWallet</title>
        <meta name="description" content="Create your ClearWallet account" />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Create Account
            </h1>
            <p style={{
              color: '#666',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Sign up for ClearWallet API access
            </p>

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee',
                color: '#c00',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '12px',
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handleSignUp}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: loading ? '#9ca3af' : '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              <span style={{ color: '#666' }}>Already have an account? </span>
              <Link href="/login" style={{ color: '#0070f3', textDecoration: 'none' }}>
                Log in
              </Link>
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#666'
          }}>
            By signing up, you agree to our{' '}
            <a href="/terms" style={{ color: '#0070f3', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" style={{ color: '#0070f3', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  );
}
