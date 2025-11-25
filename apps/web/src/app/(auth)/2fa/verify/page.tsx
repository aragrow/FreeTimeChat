/**
 * 2FA Verification Page
 *
 * Verifies 2FA code during login
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function Verify2FAPage() {
  const router = useRouter();
  const { verify2FA, getAuthHeaders } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [skipInDev, setSkipInDev] = useState(false);

  // Check if we should skip 2FA in development mode
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const shouldSkip = localStorage.getItem('skipTwoFactorInDev') === 'true';
      setSkipInDev(shouldSkip);

      if (shouldSkip) {
        // Auto-redirect to dashboard after a brief delay to show the skip message
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    }
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!useBackupCode && verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (useBackupCode && verificationCode.length === 0) {
      setError('Please enter a backup code');
      return;
    }

    setIsLoading(true);

    try {
      if (useBackupCode) {
        // For backup codes, make direct API call
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/2fa/verify-backup`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: verificationCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Invalid backup code. Please try again.');
          return;
        }

        // Successful verification
        router.push('/dashboard');
      } else {
        // For regular 2FA, use AuthContext
        const result = await verify2FA(verificationCode);

        if (!result.success) {
          setError(result.error || 'Invalid code. Please try again.');
          return;
        }

        // Successful verification
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AfricAI Digital Books</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Two-factor authentication</h2>
          <p className="mt-2 text-sm text-gray-600">Enter the code from your authenticator app</p>
        </div>

        <Card className="p-8">
          {skipInDev && process.env.NODE_ENV !== 'production' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-400 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Skipping 2FA verification (Development Mode)
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Redirecting to chat... You can disable this in Security Settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {useBackupCode ? 'Backup code' : 'Verification code'}
              </label>
              <Input
                id="verificationCode"
                name="verificationCode"
                type="text"
                inputMode={useBackupCode ? 'text' : 'numeric'}
                pattern={useBackupCode ? undefined : '[0-9]*'}
                maxLength={useBackupCode ? 32 : 6}
                required
                value={verificationCode}
                onChange={(e) => {
                  const value = useBackupCode ? e.target.value : e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                }}
                placeholder={useBackupCode ? 'Enter backup code' : '000000'}
                disabled={isLoading}
                className={useBackupCode ? '' : 'text-center text-2xl tracking-widest'}
              />
            </div>

            <Button type="submit" isLoading={isLoading} disabled={skipInDev} className="w-full">
              {skipInDev ? 'Redirecting...' : 'Verify'}
            </Button>
          </form>

          {/* Development mode skip toggle */}
          {process.env.NODE_ENV !== 'production' && !skipInDev && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-start">
                <input
                  id="skip-2fa"
                  type="checkbox"
                  checked={skipInDev}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSkipInDev(checked);
                    localStorage.setItem('skipTwoFactorInDev', checked.toString());
                    if (checked) {
                      setTimeout(() => router.push('/dashboard'), 500);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="skip-2fa" className="ml-3 text-xs text-gray-600">
                  Skip 2FA verification in development mode
                  <span className="block text-yellow-600 mt-1">
                    (Development only - will not work in production)
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setVerificationCode('');
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-500">
              Back to login
            </Link>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Lost access to your authenticator?{' '}
            <Link href="/support" className="underline hover:text-gray-700">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
