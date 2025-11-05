/**
 * 2FA Verification Page
 *
 * Verifies 2FA code during login
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function Verify2FAPage() {
  const router = useRouter();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

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
      const endpoint = useBackupCode ? '/2fa/verify-backup' : '/2fa/verify';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid code. Please try again.');
        return;
      }

      // Successful verification - redirect to app
      sessionStorage.removeItem('temp2FAToken');
      router.push('/chat');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">FreeTimeChat</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Two-factor authentication</h2>
          <p className="mt-2 text-sm text-gray-600">Enter the code from your authenticator app</p>
        </div>

        <Card className="p-8">
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

            <Button type="submit" isLoading={isLoading} className="w-full">
              Verify
            </Button>
          </form>

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
