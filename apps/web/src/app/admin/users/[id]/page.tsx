/**
 * User Detail/Edit Page
 *
 * View and edit individual user details with capability-based authorization
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';

interface UserDetail {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roles: Array<{
    id: string;
    roleId: string;
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const { hasCapability } = useCapabilities();
  const { startImpersonation } = useImpersonation();

  const userId = params?.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    roleIds: [] as string[],
  });

  // Check if user has necessary capabilities
  const canRead = hasCapability('users:read');
  const canUpdate = hasCapability('users:update');
  const canDelete = hasCapability('users:delete');

  useEffect(() => {
    if (canRead) {
      fetchUser();
      fetchRoles();
    }
  }, [userId, canRead]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
        setFormData({
          name: data.data.name || '',
          email: data.data.email || '',
          isActive: data.data.isActive,
          roleIds: data.data.roles.map((ur: any) => ur.role.id),
        });
      } else if (response.status === 403) {
        alert('You do not have permission to view this user');
        router.push('/admin/users');
      } else if (response.status === 404) {
        alert('User not found');
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      alert('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAllRoles(data.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSave = async () => {
    if (!canUpdate) {
      alert('You do not have permission to update users');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          isActive: formData.isActive,
          roleIds: formData.roleIds,
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        fetchUser();
        alert('User updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to update user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('An error occurred while updating the user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert('You do not have permission to delete users');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to deactivate user "${user?.email}"? The user will no longer be able to log in.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        alert('User deactivated successfully');
        router.push('/admin/users');
      } else {
        const errorData = await response.json();
        alert(`Failed to deactivate user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('An error occurred while deactivating the user');
    }
  };

  const handleToggle2FA = async () => {
    if (!canUpdate) {
      alert('You do not have permission to modify user settings');
      return;
    }

    const action = user?.isTwoFactorEnabled ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} 2FA for this user?`)) {
      return;
    }

    try {
      const endpoint = user?.isTwoFactorEnabled
        ? `/admin/users/${userId}/disable-2fa`
        : `/admin/users/${userId}/enable-2fa`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchUser();
        alert(`2FA ${action}d successfully`);
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action} 2FA: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to toggle 2FA:', error);
      alert('An error occurred while toggling 2FA');
    }
  };

  const handleImpersonate = async () => {
    if (!confirm(`Are you sure you want to impersonate "${user?.name}" (${user?.email})?`)) {
      return;
    }

    const success = await startImpersonation(userId);
    if (success) {
      // Redirect to chat (main app area)
      router.push('/chat');
    } else {
      alert('Failed to start impersonation. Please check the console for details.');
    }
  };

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Access Denied</p>
          <p className="text-gray-600">You do not have permission to view users.</p>
          <Link href="/admin/dashboard" className="mt-4 inline-block">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">User not found</p>
          <Link href="/admin/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-1">{user.email}</p>
        </div>
        <div className="flex gap-3">
          {!isEditing && canUpdate && <Button onClick={() => setIsEditing(true)}>Edit User</Button>}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="User name"
                />
              ) : (
                <p className="text-gray-900">{user.name || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              ) : (
                <p className="text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {isEditing ? (
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.value === 'active' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Two-Factor Authentication
              </label>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isTwoFactorEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
                {canUpdate && !isEditing && (
                  <Button size="sm" variant="outline" onClick={handleToggle2FA}>
                    {user.isTwoFactorEnabled ? 'Disable' : 'Enable'} 2FA
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Activity Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
              <p className="text-gray-900">{new Date(user.updatedAt).toLocaleString()}</p>
            </div>

            {user.lastLoginAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                <p className="text-gray-900">{new Date(user.lastLoginAt).toLocaleString()}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <p className="text-gray-600 font-mono text-sm">{user.id}</p>
            </div>

            {/* Impersonate Action */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">Impersonation</label>
              <Button size="sm" variant="outline" onClick={handleImpersonate}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Impersonate User
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Login as this user to see their view of the application
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Roles */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles</h2>
        {isEditing ? (
          <div className="space-y-2">
            {allRoles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.roleIds.includes(role.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        roleIds: [...formData.roleIds, role.id],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        roleIds: formData.roleIds.filter((id) => id !== role.id),
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">{role.name}</span>
                {role.description && (
                  <span className="text-xs text-gray-500">- {role.description}</span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.roles.length > 0 ? (
              user.roles.map((userRole) => (
                <span
                  key={userRole.id}
                  className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full"
                >
                  {userRole.role.name}
                </span>
              ))
            ) : (
              <p className="text-gray-500">No roles assigned</p>
            )}
          </div>
        )}
      </Card>

      {/* Danger Zone */}
      {canDelete && (
        <Card className="p-6 border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Deactivating this user will prevent them from logging in. This action can be reversed.
          </p>
          <Button variant="danger" onClick={handleDelete}>
            Deactivate User
          </Button>
        </Card>
      )}
    </div>
  );
}
