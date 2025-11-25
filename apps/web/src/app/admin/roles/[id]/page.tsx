/**
 * Role Detail/Edit Page
 *
 * View and edit a specific role with capability management
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface Capability {
  id: string;
  name: string;
  description: string | null;
  isAllowed: boolean;
  roleCapabilityId: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSeeded: boolean;
  createdAt: string;
  capabilities: Capability[];
  _count: {
    users: number;
  };
}

interface AllCapability {
  id: string;
  name: string;
  description: string | null;
}

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchWithAuth, user } = useAuth();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [allCapabilities, setAllCapabilities] = useState<AllCapability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user is admin (not tenantadmin)
  const isAdmin =
    user?.roles?.some(
      (role) => role && typeof role === 'string' && role.toLowerCase() === 'admin'
    ) || user?.role?.toLowerCase() === 'admin';

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [user, isAdmin, router]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(new Set());

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNameConfirmation, setDeleteNameConfirmation] = useState('');

  useEffect(() => {
    fetchRole();
    fetchAllCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const fetchRole = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleId}`);

      if (response.ok) {
        const result = await response.json();
        const roleData = result.data.role;
        setRole(roleData);
        setName(roleData.name);
        setDescription(roleData.description || '');

        // Set initially selected capabilities
        const capIds = new Set<string>(roleData.capabilities.map((c: Capability) => c.id));
        setSelectedCapabilities(capIds);
      } else {
        alert('Failed to load role');
        router.push('/admin/roles');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      alert('Failed to load role');
      router.push('/admin/roles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllCapabilities = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/capabilities`);

      if (response.ok) {
        const result = await response.json();
        setAllCapabilities(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching capabilities:', error);
    }
  };

  const handleCapabilityToggle = (capabilityId: string) => {
    const newSelected = new Set(selectedCapabilities);
    if (newSelected.has(capabilityId)) {
      newSelected.delete(capabilityId);
    } else {
      newSelected.add(capabilityId);
    }
    setSelectedCapabilities(newSelected);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Role name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: role?.isSeeded ? undefined : name.trim(), // Can't change seeded role names
          description: description.trim() || null,
          capabilityIds: Array.from(selectedCapabilities),
        }),
      });

      if (response.ok) {
        alert('Role updated successfully');
        fetchRole(); // Refresh role data
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (role?.isSeeded) {
      alert('Cannot delete seeded roles');
      return;
    }

    if (role?._count.users && role._count.users > 0) {
      alert(`Cannot delete role with ${role._count.users} assigned user(s)`);
      return;
    }

    setDeleteNameConfirmation('');
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = async () => {
    if (!role) return;

    // Check if role name matches
    if (deleteNameConfirmation !== role.name) {
      alert('Role name does not match. Please enter the exact role name to confirm deletion.');
      return;
    }

    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleId}`, { method: 'DELETE' });

      if (response.ok) {
        alert('Role deleted successfully');
        router.push('/admin/roles');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete role: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  // Group capabilities by resource
  const groupedCapabilities = allCapabilities.reduce(
    (groups, cap) => {
      const [resource] = cap.name.split(':');
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(cap);
      return groups;
    },
    {} as Record<string, AllCapability[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading role...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return <div>Role not found</div>;
  }

  // Don't render if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">403</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/roles"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Back to Roles
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {role.name}
            {role.isSeeded && (
              <span className="ml-3 text-sm font-normal text-gray-500">(System Role)</span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/roles')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Role Information */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name{' '}
                {role.isSeeded && <span className="text-gray-500">(Cannot be changed)</span>}
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role.isSeeded}
                placeholder="e.g., Project Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe this role's purpose and responsibilities"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Users with this role</p>
                <p className="text-2xl font-semibold text-gray-900">{role._count.users}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Capabilities</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedCapabilities.size}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Capabilities */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Capabilities</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select the capabilities that users with this role should have.
          </p>

          <div className="space-y-6">
            {Object.entries(groupedCapabilities).map(([resource, capabilities]) => (
              <div key={resource} className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3 capitalize">{resource}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {capabilities.map((cap) => (
                    <label
                      key={cap.id}
                      className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCapabilities.has(cap.id)}
                        onChange={() => handleCapabilityToggle(cap.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{cap.name}</div>
                        {cap.description && (
                          <div className="text-xs text-gray-500">{cap.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      {!role.isSeeded && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-600 mb-4">
              Deleting a role is permanent and cannot be undone.
              {role._count.users > 0 && (
                <span className="block mt-1 text-red-600">
                  This role cannot be deleted because it has {role._count.users} user(s) assigned.
                </span>
              )}
            </p>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={role._count.users > 0}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete Role
            </Button>
          </div>
        </Card>
      )}

      {/* Delete Role Confirmation Modal */}
      {showDeleteModal && role && (
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
              <h2 className="text-xl font-bold text-gray-900 mt-3 text-center">Delete Role</h2>
              <p className="text-sm text-gray-600 mt-2 text-center">
                This will permanently delete the role and remove it from all users who have it
                assigned.
              </p>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> To confirm, please type the role name:{' '}
                <span className="font-mono font-semibold">{role.name}</span>
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmName" className="block text-sm font-medium text-gray-700 mb-1">
                Enter role name to confirm
              </label>
              <input
                id="confirmName"
                type="text"
                value={deleteNameConfirmation}
                onChange={(e) => setDeleteNameConfirmation(e.target.value)}
                placeholder={role.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteRole}
                disabled={deleteNameConfirmation !== role.name}
                className="flex-1"
              >
                Delete Role
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteNameConfirmation('');
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
