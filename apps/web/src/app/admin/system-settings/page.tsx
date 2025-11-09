/**
 * Admin System Settings Page
 *
 * Global system-wide settings that only admins can manage
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export default function SystemSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bypassTwoFactorForAllUsers, setBypassTwoFactorForAllUsers] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/system-settings`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setBypassTwoFactorForAllUsers(data.data.bypassTwoFactorForAllUsers);
      } else {
        setMessage({ type: 'error', text: 'Failed to load system settings' });
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      setMessage({ type: 'error', text: 'An error occurred while loading settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBypassTwoFactorToggle = async (checked: boolean) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/system-settings/bypass-2fa`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bypass: checked }),
        }
      );

      if (response.ok) {
        setBypassTwoFactorForAllUsers(checked);
        setMessage({
          type: 'success',
          text: `2FA bypass for all users ${checked ? 'enabled' : 'disabled'} successfully`,
        });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update setting' });
      }
    } catch (error) {
      console.error('Error updating bypass 2FA setting:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the setting' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Manage global system-wide settings (Admin Only)</p>
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
          {/* Authentication Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication Settings</h2>

            <div className="space-y-4">
              {/* Bypass 2FA for All Users */}
              <div className="flex items-start pb-4 border-b border-gray-200">
                <input
                  id="bypass-2fa-all"
                  type="checkbox"
                  checked={bypassTwoFactorForAllUsers}
                  onChange={(e) => handleBypassTwoFactorToggle(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="ml-3 flex-1">
                  <label htmlFor="bypass-2fa-all" className="text-sm font-medium text-gray-900">
                    Bypass 2FA verification for all users
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, all users will skip 2FA verification during login, even if they
                    have 2FA enabled. This is useful for development and testing purposes.
                  </p>
                  {bypassTwoFactorForAllUsers && (
                    <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-800">
                        <strong>Warning:</strong> This setting affects all users system-wide. Make
                        sure to disable this in production environments for security.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Security Notice */}
          <Card className="p-6 bg-red-50 border-red-200">
            <h3 className="text-sm font-semibold text-red-900 mb-2">Security Notice</h3>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>System settings affect all users and tenants globally</li>
              <li>Only system administrators should have access to this page</li>
              <li>Bypassing 2FA reduces security - use with caution</li>
              <li>All changes are logged for audit purposes</li>
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
