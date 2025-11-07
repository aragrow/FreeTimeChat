/**
 * Users List Page
 *
 * Displays all users with search, filters, and management actions
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';

interface User extends Record<string, unknown> {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  roles: Array<{ role: { id: string; name: string } }>;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  clientId?: string;
  roleIds: string[];
}

export default function UsersPage() {
  const { getAuthHeaders } = useAuth();
  const router = useRouter();
  const { hasCapability } = useCapabilities();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Check capabilities
  const canRead = hasCapability('users:read');
  const canCreate = hasCapability('users:create');
  const _canUpdate = hasCapability('users:update'); // Reserved for future use
  const canDelete = hasCapability('users:delete');
  const canImpersonate = hasCapability('impersonate:start');

  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [currentPage, setCurrentPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    email: '',
    name: '',
    password: '',
    clientId: '',
    roleIds: [],
  });

  useEffect(() => {
    if (canRead) {
      fetchUsers();
    }
    if (canCreate) {
      fetchRoles();
      fetchClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, canRead, canCreate]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare data, omit clientId if empty
      const payload = {
        ...createFormData,
        clientId: createFormData.clientId || undefined,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({
          email: '',
          name: '',
          password: '',
          clientId: '',
          roleIds: [],
        });
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to create user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Create user error:', error);
      alert('An error occurred while creating the user.');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate user "${userEmail}"? The user will no longer be able to log in.`
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
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to deactivate user: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('An error occurred while deactivating the user.');
    }
  };

  const handleImpersonate = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to impersonate ${userEmail}? You will be logged in as this user.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/impersonate`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (response.ok) {
        // Redirect to chat after impersonation
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

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === '' || user.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (user) => {
        const initials = user.email
          .split('@')[0]
          .split('.')
          .map((part) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((userRole, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded"
            >
              {userRole.role.name}
            </span>
          ))}
          {user.roles.length === 0 && (
            <span className="text-sm text-gray-500">No roles assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'isTwoFactorEnabled',
      header: '2FA',
      render: (user) =>
        user.isTwoFactorEnabled ? (
          <svg
            className="w-5 h-5 text-green-600"
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
        ) : (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex items-center gap-2">
          {canRead && (
            <Link href={`/admin/users/${user.id}`}>
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
          )}
          {canImpersonate && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleImpersonate(user.id, user.email);
              }}
            >
              Impersonate
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteUser(user.id, user.email);
              }}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Access denied state
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Table<User>
        columns={columns}
        data={filteredUsers}
        keyExtractor={(user) => user.id}
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        isLoading={isLoading}
        emptyMessage="No users found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={createFormData.password}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, password: e.target.value })
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                  Client (Optional - leave empty for system admin)
                </label>
                <select
                  id="clientId"
                  value={createFormData.clientId}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, clientId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Client (System Admin)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles (Select multiple)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createFormData.roleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateFormData({
                              ...createFormData,
                              roleIds: [...createFormData.roleIds, role.id],
                            });
                          } else {
                            setCreateFormData({
                              ...createFormData,
                              roleIds: createFormData.roleIds.filter((id) => id !== role.id),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-gray-500">- {role.description}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      email: '',
                      name: '',
                      password: '',
                      clientId: '',
                      roleIds: [],
                    });
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
    </div>
  );
}
