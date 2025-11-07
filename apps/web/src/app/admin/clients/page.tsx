/**
 * Clients List Page
 *
 * Admin CRUD interface for managing client/tenant accounts
 */

'use client';

import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';

interface Client extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  databaseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  userCount?: number;
  projectCount?: number;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface CreateClientData {
  name: string;
  email: string;
  adminName: string;
  adminPassword: string;
  roleIds: string[];
}

export default function ClientsPage() {
  const { getAuthHeaders } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateClientData>({
    name: '',
    email: '',
    adminName: '',
    adminPassword: '',
    roleIds: [],
  });
  const [editFormData, setEditFormData] = useState({ name: '' });

  useEffect(() => {
    fetchClients();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && {
          includeInactive: (statusFilter === 'inactive').toString(),
        }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setClients(result.data.clients || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({ name: '', email: '', adminName: '', adminPassword: '', roleIds: [] });
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to create client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Create client error:', error);
      alert('An error occurred while creating the client.');
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingClient) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/clients/${editingClient.id}`,
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
        setEditingClient(null);
        setEditFormData({ name: '' });
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to update client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update client error:', error);
      alert('An error occurred while updating the client.');
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate "${clientName}"? The client will be soft-deleted and can be restored later.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to deactivate client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Delete client error:', error);
      alert('An error occurred while deactivating the client.');
    }
  };

  const handleRestoreClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to restore "${clientName}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/clients/${clientId}/restore`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to restore client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Restore client error:', error);
      alert('An error occurred while restoring the client.');
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      searchTerm === '' ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.databaseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && client.isActive) ||
      (statusFilter === 'inactive' && !client.isActive);

    return matchesSearch && matchesStatus;
  });

  const columns: TableColumn<Client>[] = [
    {
      key: 'name',
      header: 'Client Name',
      sortable: true,
      render: (client) => (
        <div>
          <p className="font-medium text-gray-900">{client.name}</p>
          <p className="text-sm text-gray-500">{client.slug}</p>
        </div>
      ),
    },
    {
      key: 'databaseName',
      header: 'Database',
      render: (client) => (
        <span className="text-sm font-mono text-gray-600">{client.databaseName}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (client) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {client.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (client) => new Date(client.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (client) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setEditingClient(client);
              setEditFormData({ name: client.name });
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>
          {client.isActive ? (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClient(client.id, client.name);
              }}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleRestoreClient(client.id, client.name);
              }}
            >
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client/tenant accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter((c) => c.isActive).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
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
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter((c) => !c.isActive).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name, slug, or database..."
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

      {/* Clients Table */}
      <Table<Client>
        columns={columns}
        data={filteredClients}
        keyExtractor={(client) => client.id}
        isLoading={isLoading}
        emptyMessage="No clients found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Client</h2>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="admin@acme.com"
                />
              </div>

              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Name *
                </label>
                <Input
                  id="adminName"
                  type="text"
                  required
                  value={createFormData.adminName}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, adminName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="adminPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Admin Password *
                </label>
                <Input
                  id="adminPassword"
                  type="password"
                  required
                  minLength={8}
                  value={createFormData.adminPassword}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, adminPassword: e.target.value })
                  }
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Roles *
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-gray-500">- {role.description}</span>
                      )}
                    </label>
                  ))}
                </div>
                {createFormData.roleIds.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">Please select at least one role</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Client
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      name: '',
                      email: '',
                      adminName: '',
                      adminPassword: '',
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

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Client</h2>
            <form onSubmit={handleEditClient} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <Input
                  id="editName"
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ name: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Update Client
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                    setEditFormData({ name: '' });
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
