/**
 * Tenants Management Page
 *
 * Admin interface for managing tenant/client accounts with contact and billing information
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';

interface Tenant extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  tenantKey: string;
  databaseName: string;
  databaseHost: string;
  isActive: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingEmail?: string;
  language: string;
  dateFormat: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

interface CreateTenantData {
  name: string;
  slug: string;
  tenantKey: string;
  databaseName: string;
  databaseHost: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  billingEmail: string;
  language: string;
  dateFormat: string;
  timeZone: string;
  adminUsername: string;
}

interface EditTenantData {
  name?: string;
  slug?: string;
  tenantKey?: string;
  databaseName?: string;
  databaseHost?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingEmail?: string;
  language?: string;
  dateFormat?: string;
  timeZone?: string;
}

export default function TenantsPage() {
  const { getAuthHeaders, user } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

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
  const [createFormData, setCreateFormData] = useState<CreateTenantData>({
    name: '',
    slug: '',
    tenantKey: '',
    databaseName: '',
    databaseHost: 'localhost',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'USA',
    billingEmail: '',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeZone: 'America/Chicago',
    adminUsername: '',
  });
  const [editFormData, setEditFormData] = useState<EditTenantData>({});

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && {
          isActive: (statusFilter === 'active').toString(),
        }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setTenants(result.data.tenants || []);
        setTotalPages(Math.ceil(result.data.total / result.data.limit) || 1);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({
          name: '',
          slug: '',
          tenantKey: '',
          databaseName: '',
          databaseHost: 'localhost',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          billingStreet: '',
          billingCity: '',
          billingState: '',
          billingZip: '',
          billingCountry: 'USA',
          billingEmail: '',
          adminUsername: '',
        });
        fetchTenants();
      } else {
        const errorData = await response.json();
        alert(`Failed to create tenant: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Create tenant error:', error);
      alert('An error occurred while creating the tenant.');
    }
  };

  const handleEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTenant) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${editingTenant.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (response.ok) {
        setShowEditModal(false);
        setEditingTenant(null);
        setEditFormData({});
        fetchTenants();
      } else {
        const errorData = await response.json();
        alert(`Failed to update tenant: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update tenant error:', error);
      alert('An error occurred while updating the tenant.');
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${tenantId}/status`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      );

      if (response.ok) {
        fetchTenants();
      } else {
        const errorData = await response.json();
        alert(`Failed to update tenant status: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update tenant status error:', error);
      alert('An error occurred while updating the tenant status.');
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${tenantName}"? This will permanently delete all associated data. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchTenants();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete tenant: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Delete tenant error:', error);
      alert('An error occurred while deleting the tenant.');
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      searchTerm === '' ||
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.tenantKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tenant.isActive) ||
      (statusFilter === 'inactive' && !tenant.isActive);

    return matchesSearch && matchesStatus;
  });

  const columns: TableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Tenant Name',
      sortable: true,
      render: (tenant) => (
        <div>
          <p className="font-medium text-gray-900">{tenant.name}</p>
          <p className="text-sm text-gray-500">{tenant.slug}</p>
          <p className="text-xs text-gray-400 font-mono">{tenant.tenantKey}</p>
        </div>
      ),
    },
    {
      key: 'contactEmail',
      header: 'Contact',
      render: (tenant) => (
        <div>
          {tenant.contactName && (
            <p className="text-sm font-medium text-gray-900">{tenant.contactName}</p>
          )}
          {tenant.contactEmail && <p className="text-sm text-gray-600">{tenant.contactEmail}</p>}
          {tenant.contactPhone && <p className="text-xs text-gray-500">{tenant.contactPhone}</p>}
          {!tenant.contactName && !tenant.contactEmail && (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'databaseName',
      header: 'Database',
      render: (tenant) => (
        <div>
          <span className="text-sm font-mono text-gray-600">{tenant.databaseName}</span>
          <p className="text-xs text-gray-400">{tenant.databaseHost}</p>
        </div>
      ),
    },
    {
      key: '_count',
      header: 'Users',
      render: (tenant) => (
        <span className="text-sm font-medium text-gray-900">{tenant._count?.users || 0}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (tenant) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {tenant.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (tenant) => new Date(tenant.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (tenant) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTenant(tenant);
              setEditFormData({
                name: tenant.name,
                slug: tenant.slug,
                tenantKey: tenant.tenantKey,
                databaseName: tenant.databaseName,
                databaseHost: tenant.databaseHost,
                contactName: tenant.contactName,
                contactEmail: tenant.contactEmail,
                contactPhone: tenant.contactPhone,
                billingStreet: tenant.billingStreet,
                billingCity: tenant.billingCity,
                billingState: tenant.billingState,
                billingZip: tenant.billingZip,
                billingCountry: tenant.billingCountry,
                billingEmail: tenant.billingEmail,
              });
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={tenant.isActive ? 'secondary' : 'primary'}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(tenant.id, tenant.isActive);
            }}
          >
            {tenant.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTenant(tenant.id, tenant.name);
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
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-1">Manage tenant/client accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Tenant
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
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
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
              <p className="text-sm text-gray-600">Active Tenants</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter((c) => c.isActive).length}
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
              <p className="text-sm text-gray-600">Inactive Tenants</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter((c) => !c.isActive).length}
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
              placeholder="Search by name, slug, key, or contact email..."
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
          <Button variant="outline" onClick={fetchTenants}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Tenants Table */}
      <Table<Tenant>
        columns={columns}
        data={filteredTenants}
        keyExtractor={(tenant) => tenant.id}
        onRowClick={(tenant) => {
          setEditingTenant(tenant);
          setEditFormData({
            name: tenant.name,
            slug: tenant.slug,
            tenantKey: tenant.tenantKey,
            databaseName: tenant.databaseName,
            databaseHost: tenant.databaseHost,
            contactName: tenant.contactName,
            contactEmail: tenant.contactEmail,
            contactPhone: tenant.contactPhone,
            billingStreet: tenant.billingStreet,
            billingCity: tenant.billingCity,
            billingState: tenant.billingState,
            billingZip: tenant.billingZip,
            billingCountry: tenant.billingCountry,
            billingEmail: tenant.billingEmail,
          });
          setShowEditModal(true);
        }}
        isLoading={isLoading}
        emptyMessage="No tenants found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Tenant</h2>
            <form onSubmit={handleCreateTenant} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={createFormData.name}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, name: e.target.value })
                      }
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                      Slug * (lowercase, no spaces)
                    </label>
                    <Input
                      id="slug"
                      type="text"
                      required
                      value={createFormData.slug}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, slug: e.target.value.toLowerCase() })
                      }
                      placeholder="acme-corp"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tenantKey"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tenant Key * (uppercase)
                    </label>
                    <Input
                      id="tenantKey"
                      type="text"
                      required
                      value={createFormData.tenantKey}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          tenantKey: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="ACME-CORP"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="databaseName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Database Name *
                    </label>
                    <Input
                      id="databaseName"
                      type="text"
                      required
                      value={createFormData.databaseName}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, databaseName: e.target.value })
                      }
                      placeholder="freetimechat_acme"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="databaseHost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Database Host
                    </label>
                    <Input
                      id="databaseHost"
                      type="text"
                      value={createFormData.databaseHost}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, databaseHost: e.target.value })
                      }
                      placeholder="localhost"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Name
                    </label>
                    <Input
                      id="contactName"
                      type="text"
                      value={createFormData.contactName}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, contactName: e.target.value })
                      }
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contactEmail"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Email
                    </label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={createFormData.contactEmail}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, contactEmail: e.target.value })
                      }
                      placeholder="john@acme.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="contactPhone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Phone
                    </label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={createFormData.contactPhone}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, contactPhone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="billingStreet"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Street Address
                    </label>
                    <Input
                      id="billingStreet"
                      type="text"
                      value={createFormData.billingStreet}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, billingStreet: e.target.value })
                      }
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="billingCity"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        City
                      </label>
                      <Input
                        id="billingCity"
                        type="text"
                        value={createFormData.billingCity}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, billingCity: e.target.value })
                        }
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="billingState"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        State/Province
                      </label>
                      <Input
                        id="billingState"
                        type="text"
                        value={createFormData.billingState}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, billingState: e.target.value })
                        }
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="billingZip"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        ZIP/Postal Code
                      </label>
                      <Input
                        id="billingZip"
                        type="text"
                        value={createFormData.billingZip}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, billingZip: e.target.value })
                        }
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="billingCountry"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Country
                      </label>
                      <Input
                        id="billingCountry"
                        type="text"
                        value={createFormData.billingCountry}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, billingCountry: e.target.value })
                        }
                        placeholder="USA"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="billingEmail"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Billing Email
                      </label>
                      <Input
                        id="billingEmail"
                        type="email"
                        value={createFormData.billingEmail}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, billingEmail: e.target.value })
                        }
                        placeholder="billing@acme.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Localization Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Localization Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="language"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Language *
                    </label>
                    <select
                      id="language"
                      required
                      value={createFormData.language}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, language: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="nl">Nederlands (Dutch)</option>
                      <option value="it">Italiano (Italian)</option>
                      <option value="af">Afrikaans</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="dateFormat"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Date Format *
                    </label>
                    <select
                      id="dateFormat"
                      required
                      value={createFormData.dateFormat}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, dateFormat: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                      <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="timeZone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Time Zone *
                    </label>
                    <select
                      id="timeZone"
                      required
                      value={createFormData.timeZone}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, timeZone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="US Time Zones">
                        <option value="America/New_York">Eastern Time (UTC-5/-4)</option>
                        <option value="America/Chicago">Central Time (UTC-6/-5)</option>
                        <option value="America/Denver">Mountain Time (UTC-7/-6)</option>
                        <option value="America/Phoenix">Arizona (UTC-7)</option>
                        <option value="America/Los_Angeles">Pacific Time (UTC-8/-7)</option>
                        <option value="America/Anchorage">Alaska (UTC-9/-8)</option>
                        <option value="Pacific/Honolulu">Hawaii (UTC-10)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (UTC+0/+1)</option>
                        <option value="Europe/Paris">Paris (UTC+1/+2)</option>
                        <option value="Europe/Berlin">Berlin (UTC+1/+2)</option>
                        <option value="Europe/Amsterdam">Amsterdam (UTC+1/+2)</option>
                        <option value="Europe/Rome">Rome (UTC+1/+2)</option>
                        <option value="Europe/Madrid">Madrid (UTC+1/+2)</option>
                        <option value="Europe/Athens">Athens (UTC+2/+3)</option>
                        <option value="Europe/Moscow">Moscow (UTC+3)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (UTC+4)</option>
                        <option value="Asia/Karachi">Karachi (UTC+5)</option>
                        <option value="Asia/Kolkata">Mumbai/Kolkata (UTC+5:30)</option>
                        <option value="Asia/Dhaka">Dhaka (UTC+6)</option>
                        <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                        <option value="Asia/Singapore">Singapore (UTC+8)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (UTC+8)</option>
                        <option value="Asia/Shanghai">Beijing/Shanghai (UTC+8)</option>
                        <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                        <option value="Asia/Seoul">Seoul (UTC+9)</option>
                      </optgroup>
                      <optgroup label="Australia">
                        <option value="Australia/Perth">Perth (UTC+8)</option>
                        <option value="Australia/Adelaide">Adelaide (UTC+9:30/+10:30)</option>
                        <option value="Australia/Brisbane">Brisbane (UTC+10)</option>
                        <option value="Australia/Sydney">Sydney (UTC+10/+11)</option>
                        <option value="Australia/Melbourne">Melbourne (UTC+10/+11)</option>
                      </optgroup>
                      <optgroup label="Africa">
                        <option value="Africa/Cairo">Cairo (UTC+2)</option>
                        <option value="Africa/Johannesburg">Johannesburg (UTC+2)</option>
                        <option value="Africa/Nairobi">Nairobi (UTC+3)</option>
                        <option value="Africa/Lagos">Lagos (UTC+1)</option>
                      </optgroup>
                      <optgroup label="South America">
                        <option value="America/Sao_Paulo">São Paulo (UTC-3/-2)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                        <option value="America/Santiago">Santiago (UTC-4/-3)</option>
                        <option value="America/Lima">Lima (UTC-5)</option>
                        <option value="America/Bogota">Bogotá (UTC-5)</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="UTC">UTC (UTC+0)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Admin User */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Admin User (Customer Admin)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This admin user will be automatically created for the tenant with a default
                  password &quot;firsttime&quot; and must change it on first login.
                </p>
                <div>
                  <label
                    htmlFor="adminUsername"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Admin Username * (6 digits)
                  </label>
                  <Input
                    id="adminUsername"
                    type="text"
                    required
                    value={createFormData.adminUsername}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCreateFormData({ ...createFormData, adminUsername: value });
                    }}
                    placeholder="123456"
                    maxLength={6}
                    pattern="\d{6}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email will be: {createFormData.adminUsername || 'XXXXXX'}@
                    {createFormData.slug || 'slug'}.local
                  </p>
                  <p className="text-xs text-gray-500">Default password: firsttime</p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button type="submit" className="flex-1">
                  Create Tenant
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      name: '',
                      slug: '',
                      tenantKey: '',
                      databaseName: '',
                      databaseHost: 'localhost',
                      contactName: '',
                      contactEmail: '',
                      contactPhone: '',
                      billingStreet: '',
                      billingCity: '',
                      billingState: '',
                      billingZip: '',
                      billingCountry: 'USA',
                      billingEmail: '',
                      adminUsername: '',
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

      {/* Edit Tenant Modal */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Tenant</h2>
            <form onSubmit={handleEditTenant} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="editName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tenant Name
                    </label>
                    <Input
                      id="editName"
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="editSlug"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Slug
                    </label>
                    <Input
                      id="editSlug"
                      type="text"
                      value={editFormData.slug || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Slug cannot be changed</p>
                  </div>

                  <div>
                    <label
                      htmlFor="editTenantKey"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tenant Key
                    </label>
                    <Input
                      id="editTenantKey"
                      type="text"
                      value={editFormData.tenantKey || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, tenantKey: e.target.value })
                      }
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tenant key cannot be changed</p>
                  </div>

                  <div>
                    <label
                      htmlFor="editDatabaseName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Database Name
                    </label>
                    <Input
                      id="editDatabaseName"
                      type="text"
                      value={editFormData.databaseName || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, databaseName: e.target.value })
                      }
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Database name cannot be changed</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="editContactName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Name
                    </label>
                    <Input
                      id="editContactName"
                      type="text"
                      value={editFormData.contactName || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, contactName: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="editContactEmail"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Email
                    </label>
                    <Input
                      id="editContactEmail"
                      type="email"
                      value={editFormData.contactEmail || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, contactEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="editContactPhone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Phone
                    </label>
                    <Input
                      id="editContactPhone"
                      type="tel"
                      value={editFormData.contactPhone || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, contactPhone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="editBillingStreet"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Street Address
                    </label>
                    <Input
                      id="editBillingStreet"
                      type="text"
                      value={editFormData.billingStreet || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, billingStreet: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="editBillingCity"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        City
                      </label>
                      <Input
                        id="editBillingCity"
                        type="text"
                        value={editFormData.billingCity || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingCity: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="editBillingState"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        State/Province
                      </label>
                      <Input
                        id="editBillingState"
                        type="text"
                        value={editFormData.billingState || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingState: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="editBillingZip"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        ZIP/Postal Code
                      </label>
                      <Input
                        id="editBillingZip"
                        type="text"
                        value={editFormData.billingZip || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingZip: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="editBillingCountry"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Country
                      </label>
                      <Input
                        id="editBillingCountry"
                        type="text"
                        value={editFormData.billingCountry || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingCountry: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="editBillingEmail"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Billing Email
                      </label>
                      <Input
                        id="editBillingEmail"
                        type="email"
                        value={editFormData.billingEmail || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingEmail: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Localization Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Localization Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="editLanguage"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Language *
                    </label>
                    <select
                      id="editLanguage"
                      required
                      value={editFormData.language || editingTenant.language}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, language: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="nl">Nederlands (Dutch)</option>
                      <option value="it">Italiano (Italian)</option>
                      <option value="af">Afrikaans</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="editDateFormat"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Date Format *
                    </label>
                    <select
                      id="editDateFormat"
                      required
                      value={editFormData.dateFormat || editingTenant.dateFormat}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, dateFormat: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                      <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="editTimeZone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Time Zone *
                    </label>
                    <select
                      id="editTimeZone"
                      required
                      value={editFormData.timeZone || editingTenant.timeZone}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, timeZone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="US Time Zones">
                        <option value="America/New_York">Eastern Time (UTC-5/-4)</option>
                        <option value="America/Chicago">Central Time (UTC-6/-5)</option>
                        <option value="America/Denver">Mountain Time (UTC-7/-6)</option>
                        <option value="America/Phoenix">Arizona (UTC-7)</option>
                        <option value="America/Los_Angeles">Pacific Time (UTC-8/-7)</option>
                        <option value="America/Anchorage">Alaska (UTC-9/-8)</option>
                        <option value="Pacific/Honolulu">Hawaii (UTC-10)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (UTC+0/+1)</option>
                        <option value="Europe/Paris">Paris (UTC+1/+2)</option>
                        <option value="Europe/Berlin">Berlin (UTC+1/+2)</option>
                        <option value="Europe/Amsterdam">Amsterdam (UTC+1/+2)</option>
                        <option value="Europe/Rome">Rome (UTC+1/+2)</option>
                        <option value="Europe/Madrid">Madrid (UTC+1/+2)</option>
                        <option value="Europe/Athens">Athens (UTC+2/+3)</option>
                        <option value="Europe/Moscow">Moscow (UTC+3)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (UTC+4)</option>
                        <option value="Asia/Karachi">Karachi (UTC+5)</option>
                        <option value="Asia/Kolkata">Mumbai/Kolkata (UTC+5:30)</option>
                        <option value="Asia/Dhaka">Dhaka (UTC+6)</option>
                        <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                        <option value="Asia/Singapore">Singapore (UTC+8)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (UTC+8)</option>
                        <option value="Asia/Shanghai">Beijing/Shanghai (UTC+8)</option>
                        <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                        <option value="Asia/Seoul">Seoul (UTC+9)</option>
                      </optgroup>
                      <optgroup label="Australia">
                        <option value="Australia/Perth">Perth (UTC+8)</option>
                        <option value="Australia/Adelaide">Adelaide (UTC+9:30/+10:30)</option>
                        <option value="Australia/Brisbane">Brisbane (UTC+10)</option>
                        <option value="Australia/Sydney">Sydney (UTC+10/+11)</option>
                        <option value="Australia/Melbourne">Melbourne (UTC+10/+11)</option>
                      </optgroup>
                      <optgroup label="Africa">
                        <option value="Africa/Cairo">Cairo (UTC+2)</option>
                        <option value="Africa/Johannesburg">Johannesburg (UTC+2)</option>
                        <option value="Africa/Nairobi">Nairobi (UTC+3)</option>
                        <option value="Africa/Lagos">Lagos (UTC+1)</option>
                      </optgroup>
                      <optgroup label="South America">
                        <option value="America/Sao_Paulo">São Paulo (UTC-3/-2)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                        <option value="America/Santiago">Santiago (UTC-4/-3)</option>
                        <option value="America/Lima">Lima (UTC-5)</option>
                        <option value="America/Bogota">Bogotá (UTC-5)</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="UTC">UTC (UTC+0)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button type="submit" className="flex-1">
                  Update Tenant
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTenant(null);
                    setEditFormData({});
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
