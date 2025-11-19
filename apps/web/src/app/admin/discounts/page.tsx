/**
 * Admin Discounts Page
 *
 * Manages discounts for clients and invoicing
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface Client {
  id: string;
  name: string;
}

interface Discount {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  appliesToAll: boolean;
  clientId: string | null;
  minimumAmount: number | null;
  maximumDiscount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function DiscountsPage() {
  const { getAuthHeaders } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: '',
    appliesToAll: true,
    clientId: '',
    minimumAmount: '',
    maximumDiscount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    isActive: true,
  });

  useEffect(() => {
    fetchDiscounts();
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterActive, filterType]);

  const fetchDiscounts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filterActive && { isActive: filterActive }),
        ...(filterType && { discountType: filterType }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/discounts?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setDiscounts(result.data.discounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setClients(result.data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.discountValue) {
      alert('Name and discount value are required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/discounts`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          code: formData.code || null,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          appliesToAll: formData.appliesToAll,
          clientId: formData.clientId || null,
          minimumAmount: formData.minimumAmount ? parseFloat(formData.minimumAmount) : null,
          maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchDiscounts();
      } else {
        const errorData = await response.json();
        alert(`Failed to create discount: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating discount:', error);
      alert('Failed to create discount');
    }
  };

  const handleUpdate = async () => {
    if (!editingDiscount) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/discounts/${editingDiscount.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            code: formData.code || null,
            discountType: formData.discountType,
            discountValue: parseFloat(formData.discountValue),
            appliesToAll: formData.appliesToAll,
            clientId: formData.clientId || null,
            minimumAmount: formData.minimumAmount ? parseFloat(formData.minimumAmount) : null,
            maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
            validFrom: formData.validFrom || null,
            validUntil: formData.validUntil || null,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
            isActive: formData.isActive,
          }),
        }
      );

      if (response.ok) {
        setEditingDiscount(null);
        resetForm();
        fetchDiscounts();
      } else {
        const errorData = await response.json();
        alert(`Failed to update discount: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      alert('Failed to update discount');
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/discounts/${discountId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchDiscounts();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete discount: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      appliesToAll: true,
      clientId: '',
      minimumAmount: '',
      maximumDiscount: '',
      validFrom: '',
      validUntil: '',
      usageLimit: '',
      isActive: true,
    });
  };

  const openEditModal = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      code: discount.code || '',
      discountType: discount.discountType,
      discountValue: discount.discountValue.toString(),
      appliesToAll: discount.appliesToAll,
      clientId: discount.clientId || '',
      minimumAmount: discount.minimumAmount?.toString() || '',
      maximumDiscount: discount.maximumDiscount?.toString() || '',
      validFrom: discount.validFrom ? discount.validFrom.split('T')[0] : '',
      validUntil: discount.validUntil ? discount.validUntil.split('T')[0] : '',
      usageLimit: discount.usageLimit?.toString() || '',
      isActive: discount.isActive,
    });
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.discountValue}%`;
    }
    return `$${discount.discountValue.toFixed(2)}`;
  };

  if (isLoading && discounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading discounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts</h1>
          <p className="text-sm text-gray-600">Manage discounts for clients and invoices</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Discount
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Search discounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed Amount</option>
          </select>
        </div>
      </Card>

      {/* Discounts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discounts.map((discount) => (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                      {discount.code && (
                        <div className="text-xs text-gray-500">Code: {discount.code}</div>
                      )}
                      {discount.description && (
                        <div className="text-xs text-gray-400">{discount.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDiscountValue(discount)}
                    </span>
                    {discount.maximumDiscount && (
                      <div className="text-xs text-gray-500">
                        Max: ${discount.maximumDiscount.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {discount.appliesToAll ? (
                      <span className="text-green-600">All clients</span>
                    ) : (
                      <span className="text-blue-600">
                        {clients.find((c) => c.id === discount.clientId)?.name || 'Specific client'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {discount.usageLimit ? (
                      <span>
                        {discount.usageCount} / {discount.usageLimit}
                      </span>
                    ) : (
                      <span>{discount.usageCount} (unlimited)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        discount.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(discount)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(discount.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No discounts found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDiscount) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingDiscount ? 'Edit Discount' : 'Create Discount'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Early Bird Discount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Discount for early adopters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="EARLYBIRD"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT',
                        })
                      }
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED_AMOUNT">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '50.00'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minimumAmount}
                      onChange={(e) => setFormData({ ...formData, minimumAmount: e.target.value })}
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maximumDiscount}
                      onChange={(e) =>
                        setFormData({ ...formData, maximumDiscount: e.target.value })
                      }
                      placeholder="500.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From
                    </label>
                    <Input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="appliesToAll"
                    type="checkbox"
                    checked={formData.appliesToAll}
                    onChange={(e) =>
                      setFormData({ ...formData, appliesToAll: e.target.checked, clientId: '' })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="appliesToAll" className="ml-2 text-sm text-gray-700">
                    Applies to all clients
                  </label>
                </div>

                {!formData.appliesToAll && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDiscount(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingDiscount ? handleUpdate : handleCreate}>
                  {editingDiscount ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
