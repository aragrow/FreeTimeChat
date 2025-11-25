/**
 * Profile Settings Page
 *
 * Manage communication preferences, notifications, and account recovery
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileSettingsPage() {
  const { user, fetchWithAuth } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    communicationMedium: 'email',
    notificationFrequency: 'immediate',
    secondaryEmail: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfileSettings();
    }
  }, [user]);

  const fetchProfileSettings = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/user/profile/settings`);

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setFormData({
            communicationMedium: data.data.communicationMedium || 'email',
            notificationFrequency: data.data.notificationFrequency || 'immediate',
            secondaryEmail: data.data.secondaryEmail || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile settings saved successfully' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving profile settings:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving settings' });
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
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your communication preferences and notifications
          </p>
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
          {/* Communication Medium */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Communication Medium</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred method for receiving communications from the platform
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="communicationMedium"
                  value="email"
                  checked={formData.communicationMedium === 'email'}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationMedium: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Email</div>
                  <div className="text-xs text-gray-500">Receive notifications via email</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="communicationMedium"
                  value="sms"
                  checked={formData.communicationMedium === 'sms'}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationMedium: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">SMS</div>
                  <div className="text-xs text-gray-500">
                    Receive notifications via text message
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="communicationMedium"
                  value="both"
                  checked={formData.communicationMedium === 'both'}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationMedium: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Both (Email & SMS)</div>
                  <div className="text-xs text-gray-500">
                    Receive notifications via both channels
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="communicationMedium"
                  value="none"
                  checked={formData.communicationMedium === 'none'}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationMedium: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">None</div>
                  <div className="text-xs text-gray-500">
                    Do not send notifications (not recommended)
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* Notification Frequency */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Frequency</h2>
            <p className="text-sm text-gray-600 mb-4">
              Control how often you receive notifications about user activity
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="notificationFrequency"
                  value="immediate"
                  checked={formData.notificationFrequency === 'immediate'}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationFrequency: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Immediate</div>
                  <div className="text-xs text-gray-500">
                    Receive notifications as soon as events occur
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="notificationFrequency"
                  value="hourly"
                  checked={formData.notificationFrequency === 'hourly'}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationFrequency: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Hourly Digest</div>
                  <div className="text-xs text-gray-500">
                    Receive a summary of notifications once per hour
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="notificationFrequency"
                  value="daily"
                  checked={formData.notificationFrequency === 'daily'}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationFrequency: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Daily Digest</div>
                  <div className="text-xs text-gray-500">
                    Receive a daily summary of all notifications
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="notificationFrequency"
                  value="weekly"
                  checked={formData.notificationFrequency === 'weekly'}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationFrequency: e.target.value })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Weekly Digest</div>
                  <div className="text-xs text-gray-500">
                    Receive a weekly summary of all notifications
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* Account Recovery */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Recovery</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add a secondary email address to help you recover your account if needed
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Email
                </label>
                <Input type="email" value={user?.email || ''} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">
                  Your primary email cannot be changed here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Email (Optional)
                </label>
                <Input
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                  placeholder="secondary@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;ll send a verification email to this address
                </p>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
