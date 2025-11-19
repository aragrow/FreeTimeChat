/**
 * Roles List Page
 *
 * Displays all roles with their capabilities and management actions
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';

interface Role extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  capabilityCount?: number;
  userCount?: number;
}

interface CreateRoleData {
  name: string;
  description: string;
}

export default function RolesPage() {
  const { getAuthHeaders, user } = useAuth();
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);

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

  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
  });

  const [editFormData, setEditFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteNameConfirmation, setDeleteNameConfirmation] = useState('');

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        take: '20',
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.data.roles || data.data || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({ name: '', description: '' });
        fetchRoles();
      } else {
        const errorData = await response.json();
        alert(`Failed to create role: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Create role error:', error);
      alert('An error occurred while creating the role.');
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRole) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${editingRole.id}`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (response.ok) {
        setShowEditModal(false);
        setEditingRole(null);
        setEditFormData({ name: '', description: '' });
        fetchRoles();
      } else {
        const errorData = await response.json();
        alert(`Failed to update role: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update role error:', error);
      alert('An error occurred while updating the role.');
    }
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
    setDeleteNameConfirmation('');
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    // Check if role name matches
    if (deleteNameConfirmation !== roleToDelete.name) {
      alert('Role name does not match. Please enter the exact role name to confirm deletion.');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/roles/${roleToDelete.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setShowDeleteModal(false);
        setRoleToDelete(null);
        setDeleteNameConfirmation('');
        fetchRoles();
        alert('Role deleted successfully.');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete role: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Delete role error:', error);
      alert('An error occurred while deleting the role.');
    }
  };

  const columns: TableColumn<Role>[] = [
    {
      key: 'name',
      header: 'Role Name',
      sortable: true,
      render: (role) => (
        <div>
          <p className="font-medium text-gray-900">{role.name}</p>
          {role.description && <p className="text-sm text-gray-500 mt-1">{role.description}</p>}
        </div>
      ),
    },
    {
      key: 'capabilityCount',
      header: 'Capabilities',
      sortable: true,
      render: (role) => (
        <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
          {role.capabilityCount || 0} capabilities
        </span>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      sortable: true,
      render: (role) => (
        <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">
          {role.userCount || 0} users
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (role) => new Date(role.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (role) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/roles/${role.id}`}>
            <Button size="sm" variant="outline">
              View
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setEditingRole(role);
              setEditFormData({ name: role.name, description: role.description || '' });
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRole(role.id, role.name);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-1">Manage roles and permissions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Role
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Capabilities</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.reduce((sum, role) => sum + (role.capabilityCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.reduce((sum, role) => sum + (role.userCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Roles Table */}
      <Table<Role>
        columns={columns}
        data={roles}
        keyExtractor={(role) => role.id}
        onRowClick={(role) => router.push(`/admin/roles/${role.id}`)}
        isLoading={isLoading}
        emptyMessage="No roles found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Role</h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="e.g., Manager, Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, description: e.target.value })
                  }
                  placeholder="Describe the role's purpose..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Role
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({ name: '', description: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Role</h2>
            <form onSubmit={handleEditRole} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  id="editName"
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="editDescription"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="editDescription"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Update Role
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRole(null);
                    setEditFormData({ name: '', description: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
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
                <span className="font-mono font-semibold">{roleToDelete.name}</span>
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
                placeholder={roleToDelete.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteRole}
                disabled={deleteNameConfirmation !== roleToDelete.name}
                className="flex-1"
              >
                Delete Role
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setRoleToDelete(null);
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
