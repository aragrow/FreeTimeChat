/**
 * User Detail Page
 *
 * Displays detailed information about a specific user
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roles: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUserDetails();
    fetchActivityLogs();
  }, [params.id]);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${params.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else if (response.status === 404) {
        alert('User not found');
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${params.id}/activity?take=10`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = !user.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (response.ok) {
        await fetchUserDetails();
      } else {
        const errorData = await response.json();
        alert(`Failed to update user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('An error occurred while updating the user status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;

    if (
      !confirm(
        `Are you sure you want to impersonate ${user.email}? You will be logged in as this user.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: user.id }),
      });

      if (response.ok) {
        router.push('/chat');
      } else {
        const errorData = await response.json();
        alert(`Failed to impersonate user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('An error occurred while trying to impersonate the user.');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
        <Button onClick={() => router.push('/admin/users')} className="mt-4">
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleImpersonate}>
            Sign in as User
          </Button>
          <Button variant="outline">Edit User</Button>
        </div>
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-semibold mb-4">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            <div className="mt-4 flex gap-2">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {user.isTwoFactorEnabled && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  2FA Enabled
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Account Details Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-sm font-medium text-gray-900">{formatTimestamp(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">{formatTimestamp(user.updatedAt)}</p>
            </div>
            {user.lastLoginAt && (
              <div>
                <p className="text-sm text-gray-600">Last Login</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTimestamp(user.lastLoginAt)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Roles Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles</h3>
          {user.roles.length > 0 ? (
            <div className="space-y-2">
              {user.roles.map((role) => (
                <div key={role.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">{role.name}</p>
                  {role.description && (
                    <p className="text-xs text-purple-700 mt-1">{role.description}</p>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2">
                Manage Roles
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">No roles assigned</p>
              <Button variant="outline" size="sm">
                Assign Role
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Actions Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant={user.isActive ? 'danger' : 'primary'}
            onClick={handleToggleStatus}
            isLoading={isUpdating}
            className="w-full"
          >
            {user.isActive ? 'Deactivate User' : 'Activate User'}
          </Button>
          <Button variant="outline" className="w-full">
            Reset Password
          </Button>
          <Button variant="outline" className="w-full">
            {user.isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
      </Card>

      {/* Activity Log */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {activityLogs.length > 0 ? (
          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{log.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</p>
                    {log.ipAddress && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 font-mono">{log.ipAddress}</p>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600">No recent activity</p>
          </div>
        )}
      </Card>
    </div>
  );
}
