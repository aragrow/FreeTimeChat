/**
 * Admin Vendors Page
 *
 * Manages vendors/suppliers for Account Payables
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface Vendor {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  contactPerson: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  paymentTermDays: number;
  accountNumber: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export default function VendorsPage() {
  const { getAuthHeaders } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    website: '',
    contactPerson: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    paymentTermDays: '30',
    accountNumber: '',
    taxId: '',
    bankName: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, includeInactive]);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(includeInactive && { includeInactive: 'true' }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vendors?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setVendors(result.data.vendors || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      website: '',
      contactPerson: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      paymentTermDays: '30',
      accountNumber: '',
      taxId: '',
      bankName: '',
      bankAccountNumber: '',
      bankRoutingNumber: '',
      notes: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Vendor name is required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vendors`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          paymentTermDays: parseInt(formData.paymentTermDays) || 30,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetFormData();
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert(`Failed to create vendor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const handleUpdate = async () => {
    if (!editingVendor) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/vendors/${editingVendor.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            paymentTermDays: parseInt(formData.paymentTermDays) || 30,
          }),
        }
      );

      if (response.ok) {
        setEditingVendor(null);
        resetFormData();
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert(`Failed to update vendor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor');
    }
  };

  const handleToggleActive = async (vendorId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle vendor status: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error toggling vendor status:', error);
    }
  };

  const handleDelete = async (vendorId: string, vendorName: string) => {
    if (
      !confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete vendor: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      return cleaned;
    }

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

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      companyName: vendor.companyName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      contactPerson: vendor.contactPerson || '',
      addressLine1: vendor.addressLine1 || '',
      addressLine2: vendor.addressLine2 || '',
      city: vendor.city || '',
      state: vendor.state || '',
      postalCode: vendor.postalCode || '',
      country: vendor.country || '',
      paymentTermDays: vendor.paymentTermDays?.toString() || '30',
      accountNumber: vendor.accountNumber || '',
      taxId: vendor.taxId || '',
      bankName: vendor.bankName || '',
      bankAccountNumber: vendor.bankAccountNumber || '',
      bankRoutingNumber: vendor.bankRoutingNumber || '',
      notes: vendor.notes || '',
    });
  };

  if (isLoading && vendors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage suppliers and vendors for Account Payables</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name, company, or email..."
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

      {/* Vendors Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Terms
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
              {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => openEditModal(vendor)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{vendor.name}</div>
                    {vendor.companyName && (
                      <div className="text-sm text-gray-500">{vendor.companyName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {vendor.contactPerson && (
                      <div className="text-sm text-gray-900">{vendor.contactPerson}</div>
                    )}
                    {vendor.email && <div className="text-sm text-gray-500">{vendor.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Net {vendor.paymentTermDays}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(vendor);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(vendor.id, vendor.isActive);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {vendor.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vendor.id, vendor.name);
                        }}
                        className="text-red-600 hover:text-red-900"
                        disabled={vendor.isActive}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No vendors found. Click &quot;Add Vendor&quot; to create one.
                  </td>
                </tr>
              )}
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
            <h2 className="text-xl font-bold mb-6">Create New Vendor</h2>

            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Vendor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
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
                    Contact Person
                  </label>
                  <Input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <Input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Suite, unit, building, floor, etc."
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <Input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="ZIP / Postal code"
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

            {/* Payment Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms (Days)
                  </label>
                  <Input
                    type="number"
                    value={formData.paymentTermDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermDays: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Your account with vendor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <Input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Vendor's tax ID"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Bank Details (for payments)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <Input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccountNumber: e.target.value })
                    }
                    placeholder="Bank account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Routing Number
                  </label>
                  <Input
                    type="text"
                    value={formData.bankRoutingNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bankRoutingNumber: e.target.value })
                    }
                    placeholder="Routing number"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Notes</h3>
              <div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this vendor..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetFormData();
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
      {editingVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Edit Vendor</h2>

            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Vendor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
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
                    Contact Person
                  </label>
                  <Input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <Input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Suite, unit, building, floor, etc."
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <Input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="ZIP / Postal code"
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

            {/* Payment Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms (Days)
                  </label>
                  <Input
                    type="number"
                    value={formData.paymentTermDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermDays: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Your account with vendor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <Input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Vendor's tax ID"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Bank Details (for payments)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <Input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccountNumber: e.target.value })
                    }
                    placeholder="Bank account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Routing Number
                  </label>
                  <Input
                    type="text"
                    value={formData.bankRoutingNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, bankRoutingNumber: e.target.value })
                    }
                    placeholder="Routing number"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Notes</h3>
              <div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this vendor..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingVendor(null);
                  resetFormData();
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
