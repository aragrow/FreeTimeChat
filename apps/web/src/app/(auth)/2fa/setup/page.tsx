/**
 * 2FA Setup Page
 *
 * Displays QR code for 2FA setup and allows verification
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface BackupCode {
  code: string;
}

export default function Setup2FAPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');

  useEffect(() => {
    enableTwoFactor();
  }, []);

  const enableTwoFactor = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/2fa/enable`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to set up 2FA. Please try again.');
        return;
      }

      setQrCode(data.data.qrCode);
      setSecret(data.data.secret);
    } catch (err) {
      console.error('2FA setup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/2fa/verify`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid verification code. Please try again.');
        return;
      }

      // 2FA successfully enabled
      setBackupCodes(data.data.backupCodes || []);
      setStep('complete');
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.map((b) => b.code).join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freetimechat-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Setting up two-factor authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AfricAI Digital Books</h1>
          <h2 className="text-2xl font-semibold text-gray-700">
            {step === 'setup' && 'Set up two-factor authentication'}
            {step === 'verify' && 'Verify your code'}
            {step === 'complete' && 'Save your backup codes'}
          </h2>
        </div>

        <Card className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <div className="flex justify-center bg-white p-4 rounded">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can't scan the QR code?</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Enter this code manually in your authenticator app:
                </p>
                <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">{secret}</div>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                Continue to verify
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Step 2: Enter verification code
                </h3>
                <p className="text-sm text-blue-700">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div>
                <label
                  htmlFor="verificationCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Verification code
                </label>
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={isVerifying}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep('setup')}
                  disabled={isVerifying}
                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Back
                </Button>
                <Button type="submit" isLoading={isVerifying} className="flex-1">
                  Verify and enable
                </Button>
              </div>
            </form>
          )}

          {step === 'complete' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-900">2FA successfully enabled!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your account is now protected with two-factor authentication
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Backup codes</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Save these backup codes in a safe place. Each code can only be used once.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded p-4 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {backupCodes.map((backup, index) => (
                    <div key={index} className="font-mono text-sm">
                      {backup.code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Download codes
                </Button>
                <Button type="button" onClick={handleComplete} className="flex-1">
                  Continue to app
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
