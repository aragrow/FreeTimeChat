/**
 * Admin Clients Page
 *
 * Manages client accounts (customers/tenants)
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

// Check if user is a tenant admin (has tenantId that's not 'system')
const isTenantAdmin = (user: { tenantId?: string | null; roles?: string[] } | null): boolean => {
  if (!user) return false;
  // System admins don't have a tenantId or have 'system' as tenantId
  return user.tenantId !== undefined && user.tenantId !== 'system' && user.tenantId !== null;
};

interface Client {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
  companyName: string | null;
  // Schema field names (what API returns)
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  billingContactPhone: string | null;
  hourlyRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    tenantKey: string;
    isActive: boolean;
  };
}

export default function ClientsPage() {
  const { getAuthHeaders, user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check if user is a tenant admin
  const userIsTenantAdmin = isTenantAdmin(user);

  // API endpoint - always 'clients' (the route handles both system admin and tenant admin)
  const apiEndpoint = 'clients';

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    tenantId: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: '',
    hourlyRate: '',
  });

  // Available tenants for dropdown (only for system admins)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; tenantKey: string }>>(
    []
  );

  useEffect(() => {
    fetchClients();
    // Only fetch tenants for system admins
    if (!userIsTenantAdmin) {
      fetchTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, includeInactive, userIsTenantAdmin]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(includeInactive && { includeInactive: 'true' }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/${apiEndpoint}?${params}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

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

  const fetchTenants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setTenants(
          (result.data.tenants || []).map((t: { id: string; name: string; tenantKey: string }) => ({
            id: t.id,
            name: t.name,
            tenantKey: t.tenantKey,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const handleCreate = async () => {
    // For tenant admins, only name is required (tenant is automatic)
    // For system admins, both name and tenantId are required
    if (!formData.name) {
      alert('Name is required');
      return;
    }
    if (!userIsTenantAdmin && !formData.tenantId) {
      alert('Name and Tenant are required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/${apiEndpoint}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          tenantId: '',
          companyName: '',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          billingContactName: '',
          billingContactEmail: '',
          billingContactPhone: '',
          hourlyRate: '',
        });
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to create client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client');
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/${apiEndpoint}/${editingClient.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setEditingClient(null);
        setFormData({
          name: '',
          tenantId: '',
          companyName: '',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          billingContactName: '',
          billingContactEmail: '',
          billingContactPhone: '',
          hourlyRate: '',
        });
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to update client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client');
    }
  };

  const handleToggleActive = async (clientId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/${apiEndpoint}/${clientId}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (response.ok) {
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle client status: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error toggling client status:', error);
    }
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    if (
      !confirm(`Are you sure you want to deactivate "${clientName}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/${apiEndpoint}/${clientId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchClients();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete client: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters except + at start
    const cleaned = value.replace(/[^\d+]/g, '');

    // If starts with +, it's international - just add spacing
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // US/Canada format: (XXX) XXX-XXXX
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const [, area, prefix, line] = match;
      if (line) {
        return `(${area}) ${prefix}-${line}`;
      } else if (prefix) {
        return area.length === 3 ? `(${area}) ${prefix}` : area;
      } else {
        return area;
      }
    }

    return cleaned;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, contactPhone: formatted });
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    // Map schema field names to form field names
    setFormData({
      name: client.name,
      tenantId: client.tenantId,
      companyName: client.companyName || '',
      contactName: client.contactPerson || '',
      contactEmail: client.email || '',
      contactPhone: client.phone || '',
      address: client.billingAddressLine1 || '',
      city: client.billingCity || '',
      state: client.billingState || '',
      zipCode: client.billingPostalCode || '',
      country: client.billingCountry || '',
      billingContactName: client.billingContactName || '',
      billingContactEmail: client.billingContactEmail || '',
      billingContactPhone: client.billingContactPhone || '',
      hourlyRate: client.hourlyRate ? client.hourlyRate.toString() : '',
    });
  };

  if (isLoading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage client accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Include inactive</span>
          </label>
        </div>
      </Card>

      {/* Clients Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                {!userIsTenantAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tenant
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => openEditModal(client)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    {client.companyName && (
                      <div className="text-sm text-gray-500">{client.companyName}</div>
                    )}
                  </td>
                  {!userIsTenantAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.tenant?.name || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {client.contactPerson && (
                      <div className="text-sm text-gray-900">{client.contactPerson}</div>
                    )}
                    {client.email && <div className="text-sm text-gray-500">{client.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(client);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(client.id, client.isActive);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {client.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id, client.name);
                        }}
                        className="text-red-600 hover:text-red-900"
                        disabled={client.isActive}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Create New Client</h2>

            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Basic Information
              </h3>
              <div className={userIsTenantAdmin ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                {!userIsTenantAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                    <select
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.tenantKey}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Billing Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <Input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <Input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="ZIP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Billing Contact */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Billing Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Contact Name
                  </label>
                  <Input
                    type="text"
                    value={formData.billingContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, billingContactName: e.target.value })
                    }
                    placeholder="Billing contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.billingContactPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingContactPhone: formatPhoneNumber(e.target.value),
                      })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, billingContactEmail: e.target.value })
                  }
                  placeholder="billing@example.com"
                />
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Billing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Hourly Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    name: '',
                    tenantId: '',
                    companyName: '',
                    contactName: '',
                    contactEmail: '',
                    contactPhone: '',
                    address: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                    billingContactName: '',
                    billingContactEmail: '',
                    billingContactPhone: '',
                    hourlyRate: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Edit Client</h2>

            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Basic Information
              </h3>
              <div className={userIsTenantAdmin ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                {!userIsTenantAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                    <select
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                      disabled
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.tenantKey}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tenant cannot be changed</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Billing Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <Input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <Input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="ZIP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Billing Contact */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Billing Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Contact Name
                  </label>
                  <Input
                    type="text"
                    value={formData.billingContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, billingContactName: e.target.value })
                    }
                    placeholder="Billing contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.billingContactPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingContactPhone: formatPhoneNumber(e.target.value),
                      })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, billingContactEmail: e.target.value })
                  }
                  placeholder="billing@example.com"
                />
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Billing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Hourly Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingClient(null);
                  setFormData({
                    name: '',
                    tenantId: '',
                    companyName: '',
                    contactName: '',
                    contactEmail: '',
                    contactPhone: '',
                    address: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                    billingContactName: '',
                    billingContactEmail: '',
                    billingContactPhone: '',
                    hourlyRate: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
