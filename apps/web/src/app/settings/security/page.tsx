/**
 * Security Settings Page
 *
 * Manage password, 2FA, and security preferences
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function SecuritySettingsPage() {
  const { user, getAuthHeaders } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      fetchSecuritySettings();
    }
  }, [user]);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/security/settings`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setTwoFactorEnabled(data.data.twoFactorEnabled || false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/password/change`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'An error occurred while changing password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/enable`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setQRCodeData(data.data);
        setShowQRCode(true);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to enable 2FA' });
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setMessage({ type: 'error', text: 'An error occurred while enabling 2FA' });
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '2FA enabled successfully' });
        setTwoFactorEnabled(true);
        setShowQRCode(false);
        setQRCodeData(null);
        setVerificationCode('');
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Invalid verification code' });
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setMessage({ type: 'error', text: 'An error occurred while verifying 2FA' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '2FA disabled successfully' });
        setTwoFactorEnabled(false);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to disable 2FA' });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setMessage({ type: 'error', text: 'An error occurred while disabling 2FA' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-600 mt-1">Manage your password and security preferences</p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Password Change */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose a strong password to keep your account secure
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                />
              </div>

              <Button onClick={handlePasswordChange} disabled={isSaving}>
                {isSaving ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {!twoFactorEnabled && !showQRCode && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Two-factor authentication (2FA) adds an additional layer of security to your
                  account by requiring a verification code from your phone in addition to your
                  password.
                </p>
                <Button onClick={handleEnable2FA}>Enable 2FA</Button>
              </div>
            )}

            {showQRCode && qrCodeData && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Step 1: Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center my-4">
                    <img src={qrCodeData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Or manually enter this code:</p>
                  <code className="block bg-white p-2 rounded text-sm font-mono text-center">
                    {qrCodeData.secret}
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Step 2: Enter the 6-digit verification code from your app
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      maxLength={6}
                      className="text-center font-mono text-lg"
                    />
                    <Button
                      onClick={handleVerify2FA}
                      disabled={isSaving || verificationCode.length !== 6}
                    >
                      {isSaving ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQRCode(false);
                    setQRCodeData(null);
                    setVerificationCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {twoFactorEnabled && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Two-factor authentication is currently enabled. You&apos;ll be prompted for a
                  verification code when you sign in.
                </p>
                <Button variant="danger" onClick={handleDisable2FA} disabled={isSaving}>
                  {isSaving ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            )}
          </Card>

          {/* Security Tips */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Security Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use a unique password that you don&apos;t use for other accounts</li>
              <li>Enable two-factor authentication for additional security</li>
              <li>Never share your password or 2FA codes with anyone</li>
              <li>Review your account activity regularly</li>
              <li>Use a password manager to generate and store strong passwords</li>
            </ul>
          </Card>

          {/* Back Button */}
          <div className="flex justify-end">
            <Link href="/admin/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
