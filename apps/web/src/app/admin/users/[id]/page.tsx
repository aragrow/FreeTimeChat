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
  trackingMode?: string;
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

interface Project {
  id: string;
  name: string;
  description?: string;
  clientName?: string;
  isActive: boolean;
}

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  project: Project;
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
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjectMembers, setUserProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isActive: true,
    trackingMode: 'BOTH' as 'CLOCK' | 'TIME' | 'BOTH',
    roleIds: [] as string[],
    projectIds: [] as string[],
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailConfirmation, setDeleteEmailConfirmation] = useState('');

  // Check if user has necessary capabilities
  const canRead = hasCapability('users:read');
  const canUpdate = hasCapability('users:update');
  const canDelete = hasCapability('users:delete');

  useEffect(() => {
    if (canRead) {
      fetchUser();
      fetchRoles();
      fetchProjects();
      fetchUserProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          trackingMode: data.data.trackingMode || 'BOTH',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          roleIds: data.data.roles.map((ur: any) => ur.role.id),
          projectIds: [], // Will be set by fetchUserProjects
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

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?take=1000`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAllProjects(data.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/user/${userId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const members = data.data || [];
        setUserProjectMembers(members);
        // Update form data with project IDs
        setFormData((prev) => ({
          ...prev,
          projectIds: members.map((m: ProjectMember) => m.projectId),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user projects:', error);
    }
  };

  const handleSave = async () => {
    if (!canUpdate) {
      alert('You do not have permission to update users');
      return;
    }

    try {
      setIsSaving(true);

      // Update user basic info and roles
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
          trackingMode: formData.trackingMode,
          roleIds: formData.roleIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to update user: ${errorData.message}`);
        return;
      }

      // Update project assignments
      const originalProjectIds = userProjectMembers.map((m) => m.projectId);
      const newProjectIds = formData.projectIds;

      // Find projects to remove (in original but not in new)
      const projectsToRemove = userProjectMembers.filter(
        (m) => !newProjectIds.includes(m.projectId)
      );

      // Find projects to add (in new but not in original)
      const projectIdsToAdd = newProjectIds.filter((id) => !originalProjectIds.includes(id));

      // Remove projects
      for (const member of projectsToRemove) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/${member.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      }

      // Add projects
      if (projectIdsToAdd.length > 0) {
        for (const projectId of projectIdsToAdd) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/project-members`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              userId,
            }),
          });
        }
      }

      setIsEditing(false);
      fetchUser();
      fetchUserProjects();
      alert('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('An error occurred while updating the user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!canDelete) {
      alert('You do not have permission to delete users');
      return;
    }

    setDeleteEmailConfirmation('');
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!user) return;

    // Check if email matches
    if (deleteEmailConfirmation !== user.email) {
      alert('Email does not match. Please enter the exact email address to confirm deletion.');
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
                Time Tracking Mode
              </label>
              {isEditing ? (
                <select
                  value={formData.trackingMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trackingMode: e.target.value as 'CLOCK' | 'TIME' | 'BOTH',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CLOCK">Clock Only (Time Clock)</option>
                  <option value="TIME">Manual Entry Only</option>
                  <option value="BOTH">Both Clock & Manual Entry</option>
                </select>
              ) : (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {user.trackingMode === 'CLOCK'
                    ? 'Clock Only'
                    : user.trackingMode === 'TIME'
                      ? 'Manual Entry Only'
                      : 'Both'}
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

      {/* Projects */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Projects</h2>
        {isEditing ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allProjects.length > 0 ? (
              allProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.projectIds.includes(project.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          projectIds: [...formData.projectIds, project.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          projectIds: formData.projectIds.filter((id) => id !== project.id),
                        });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{project.name}</span>
                      {!project.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-500 truncate">{project.description}</p>
                    )}
                    {project.clientName && (
                      <p className="text-xs text-gray-400">Client: {project.clientName}</p>
                    )}
                  </div>
                </label>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No projects available</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userProjectMembers.length > 0 ? (
              userProjectMembers.map((member) => (
                <div
                  key={member.id}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{member.project.name}</span>
                    {!member.project.isActive && (
                      <span className="text-xs text-blue-600">(Inactive)</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No projects assigned</p>
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

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-3 text-center">Deactivate User</h2>
              <p className="text-sm text-gray-600 mt-2 text-center">
                This will deactivate the user account. The user will no longer be able to log in.
              </p>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> To confirm, please type the user&apos;s email address:{' '}
                <span className="font-mono font-semibold">{user.email}</span>
              </p>
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Enter email to confirm
              </label>
              <input
                id="confirmEmail"
                type="text"
                value={deleteEmailConfirmation}
                onChange={(e) => setDeleteEmailConfirmation(e.target.value)}
                placeholder={user.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteUser}
                disabled={deleteEmailConfirmation !== user.email}
                className="flex-1"
              >
                Deactivate User
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteEmailConfirmation('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
