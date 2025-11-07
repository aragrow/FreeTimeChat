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
  const { getAuthHeaders } = useAuth();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [allCapabilities, setAllCapabilities] = useState<AllCapability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRole();
    fetchAllCapabilities();
  }, [roleId]);

  const fetchRole = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const roleData = result.data.role;
        setRole(roleData);
        setName(roleData.name);
        setDescription(roleData.description || '');

        // Set initially selected capabilities
        const capIds = new Set(roleData.capabilities.map((c: Capability) => c.id));
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/capabilities`, {
        headers: getAuthHeaders(),
      });

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
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
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

  const handleDelete = async () => {
    if (role?.isSeeded) {
      alert('Cannot delete seeded roles');
      return;
    }

    if (role?._count.users && role._count.users > 0) {
      alert(`Cannot delete role with ${role._count.users} assigned user(s)`);
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete the role "${role?.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

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
    </div>
  );
}
