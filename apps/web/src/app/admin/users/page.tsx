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

interface Tenant {
  id: string;
  name: string;
  slug: string;
  tenantKey: string;
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  tenantId?: string;
  roleIds: string[];
}

export default function UsersPage() {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const router = useRouter();
  const { hasCapability } = useCapabilities();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

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
    tenantId: '',
    roleIds: [],
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [deleteEmailConfirmation, setDeleteEmailConfirmation] = useState('');

  // Password display modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdUserEmail, setCreatedUserEmail] = useState('');

  useEffect(() => {
    if (canRead) {
      fetchUsers();
    }
    if (canCreate) {
      fetchRoles();
      // Fetch tenants for both admin and tenantadmin
      // Admin: needs all tenants for dropdown
      // Tenantadmin: needs their tenant name to display
      if (currentUser?.roles?.includes('admin')) {
        fetchTenants();
      } else if (currentUser?.roles?.includes('tenantadmin') && currentUser.tenantId) {
        fetchCurrentTenant(currentUser.tenantId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, canRead, canCreate, currentUser]);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/roles?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.data.roles || []);
      } else {
        console.error('Failed to fetch roles:', response.status);
        setRoles([]);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setRoles([]);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenants?limit=100&isActive=true`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTenants(data.data.tenants || []);
      } else {
        console.error('Failed to fetch tenants:', response.status);
        setTenants([]);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      setTenants([]);
    }
  };

  const fetchCurrentTenant = async (tenantId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${tenantId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // Set tenants array with just this one tenant
        setTenants([data.data]);
      } else {
        console.error('Failed to fetch current tenant:', response.status);
        setTenants([]);
      }
    } catch (error) {
      console.error('Failed to fetch current tenant:', error);
      setTenants([]);
    }
  };

  // Generate a secure random password
  const generatePassword = (): string => {
    const length = 16;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Generate a random password
      const autoPassword = generatePassword();

      // Determine the tenantId based on user role
      let tenantId = createFormData.tenantId;

      // If user is a tenantadmin, use their tenantId
      if (currentUser?.roles?.includes('tenantadmin') && currentUser.tenantId) {
        tenantId = currentUser.tenantId;
      }

      // Prepare data, omit tenantId if empty
      const payload = {
        ...createFormData,
        password: autoPassword,
        tenantId: tenantId || undefined,
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
        // Store generated password and email to show in modal
        setGeneratedPassword(autoPassword);
        setCreatedUserEmail(createFormData.email);

        // Close create modal and reset form
        setShowCreateModal(false);
        setCreateFormData({
          email: '',
          name: '',
          password: '',
          tenantId: '',
          roleIds: [],
        });

        // Show password modal
        setShowPasswordModal(true);

        // Refresh users list
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

  const handleDeleteUser = (userId: string, userEmail: string) => {
    setUserToDelete({ id: userId, email: userEmail });
    setDeleteEmailConfirmation('');
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    // Check if email matches
    if (deleteEmailConfirmation !== userToDelete.email) {
      alert('Email does not match. Please enter the exact email address to confirm deletion.');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userToDelete.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setShowDeleteModal(false);
        setUserToDelete(null);
        setDeleteEmailConfirmation('');
        fetchUsers();
        alert('User deactivated successfully.');
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}/impersonate`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Store the new impersonation token
        localStorage.setItem('accessToken', data.data.accessToken);
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

  // Define role hierarchy (higher number = higher privilege)
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    tenantadmin: 2,
    user: 1,
  };

  // Get current user's highest role level
  const getCurrentUserRoleLevel = (): number => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return 0;

    return Math.max(...currentUser.roles.map((role) => roleHierarchy[role.toLowerCase()] || 0));
  };

  // Filter roles based on current user's role level
  const getAvailableRoles = (): Role[] => {
    const currentUserLevel = getCurrentUserRoleLevel();

    return roles.filter((role) => {
      const roleLevel = roleHierarchy[role.name.toLowerCase()] || 0;
      // Only show roles at same level or below
      return roleLevel <= currentUserLevel;
    });
  };

  const availableRoles = getAvailableRoles();

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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Auto-generated Password</p>
                    <p className="text-xs text-blue-700 mt-1">
                      A secure password will be automatically generated. The user will be required
                      to change it on first login.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tenant Selection - Conditional based on user role */}
              <div>
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant{' '}
                  {currentUser?.roles?.includes('admin') &&
                    '(Optional - leave empty for system admin)'}
                </label>
                {currentUser?.roles?.includes('admin') ? (
                  // Admin users: Show dropdown with all tenants
                  <select
                    id="tenantId"
                    value={createFormData.tenantId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, tenantId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Tenant (System Admin)</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                ) : currentUser?.roles?.includes('tenantadmin') ? (
                  // Tenant admins: Show their tenant (readonly)
                  <input
                    id="tenantId"
                    type="text"
                    value={
                      tenants.find((t) => t.id === currentUser.tenantId)?.name ||
                      currentUser.tenantId ||
                      'Loading...'
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                ) : (
                  // Fallback: No tenant selection
                  <input
                    id="tenantId"
                    type="text"
                    value="No tenant assigned"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles (Select multiple)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {availableRoles.length > 0 ? (
                    availableRoles.map((role) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No roles available to assign
                    </p>
                  )}
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
                      tenantId: '',
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

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
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
                <span className="font-mono font-semibold">{userToDelete.email}</span>
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
                placeholder={userToDelete.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteUser}
                disabled={deleteEmailConfirmation !== userToDelete.email}
                className="flex-1"
              >
                Deactivate User
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
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

      {/* Generated Password Display Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
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
              <h2 className="text-xl font-bold text-gray-900 mt-3 text-center">
                User Created Successfully
              </h2>
              <p className="text-sm text-gray-600 mt-2 text-center">
                A temporary password has been generated for <strong>{createdUserEmail}</strong>
              </p>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                Important: Save this password now!
              </p>
              <p className="text-xs text-yellow-700">
                This password will only be shown once. The user will be required to change it on
                first login.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temporary Password
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedPassword}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    alert('Password copied to clipboard!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setGeneratedPassword('');
                setCreatedUserEmail('');
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
