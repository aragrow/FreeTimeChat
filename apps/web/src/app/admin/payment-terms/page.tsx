/**
 * Admin Payment Terms Page
 *
 * Manages payment terms (Net 30, Due on Receipt, etc.) for invoicing
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface PaymentTerm {
  id: string;
  name: string;
  description: string | null;
  daysUntilDue: number;
  discountPercent: number | null;
  discountDays: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function PaymentTermsPage() {
  const { getAuthHeaders } = useAuth();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    daysUntilDue: '',
    discountPercent: '',
    discountDays: '',
    isActive: true,
  });

  useEffect(() => {
    fetchPaymentTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchPaymentTerms = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms?${params}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPaymentTerms(result.data.paymentTerms || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const seedDefaults = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms/seed`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchPaymentTerms();
        alert('Default payment terms seeded successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to seed defaults: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to seed defaults:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.daysUntilDue) {
      alert('Name and days until due are required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          daysUntilDue: parseInt(formData.daysUntilDue),
          discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
          discountDays: formData.discountDays ? parseInt(formData.discountDays) : null,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchPaymentTerms();
      } else {
        const errorData = await response.json();
        alert(`Failed to create payment term: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating payment term:', error);
      alert('Failed to create payment term');
    }
  };

  const handleUpdate = async () => {
    if (!editingTerm) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms/${editingTerm.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            daysUntilDue: parseInt(formData.daysUntilDue),
            discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
            discountDays: formData.discountDays ? parseInt(formData.discountDays) : null,
            isActive: formData.isActive,
          }),
        }
      );

      if (response.ok) {
        setEditingTerm(null);
        resetForm();
        fetchPaymentTerms();
      } else {
        const errorData = await response.json();
        alert(`Failed to update payment term: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating payment term:', error);
      alert('Failed to update payment term');
    }
  };

  const handleDelete = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this payment term?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms/${termId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchPaymentTerms();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete payment term: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting payment term:', error);
    }
  };

  const handleSetDefault = async (termId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms/${termId}/default`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchPaymentTerms();
      } else {
        const errorData = await response.json();
        alert(`Failed to set default: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      daysUntilDue: '',
      discountPercent: '',
      discountDays: '',
      isActive: true,
    });
  };

  const openEditModal = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      description: term.description || '',
      daysUntilDue: term.daysUntilDue.toString(),
      discountPercent: term.discountPercent?.toString() || '',
      discountDays: term.discountDays?.toString() || '',
      isActive: term.isActive,
    });
  };

  if (isLoading && paymentTerms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Terms</h1>
          <p className="text-sm text-gray-600">Manage invoice payment terms and conditions</p>
        </div>
        <div className="flex gap-2">
          {paymentTerms.length === 0 && (
            <Button variant="outline" onClick={seedDefaults}>
              Seed Defaults
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Payment Term
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6 p-4">
        <Input
          type="text"
          placeholder="Search payment terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </Card>

      {/* Payment Terms Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Until Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Early Payment Discount
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
              {paymentTerms.map((term) => (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{term.name}</div>
                        {term.description && (
                          <div className="text-xs text-gray-500">{term.description}</div>
                        )}
                      </div>
                      {term.isDefault && (
                        <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {term.daysUntilDue} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {term.discountPercent && term.discountDays ? (
                      <span>
                        {term.discountPercent}% if paid within {term.discountDays} days
                      </span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        term.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {term.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {!term.isDefault && (
                        <button
                          onClick={() => handleSetDefault(term.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Set as Default"
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
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(term)}
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
                        onClick={() => handleDelete(term.id)}
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
              {paymentTerms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No payment terms found. Click &quot;Seed Defaults&quot; to create standard
                    terms.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTerm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingTerm ? 'Edit Payment Term' : 'Create Payment Term'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Net 30"
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
                    placeholder="Payment due within 30 days"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days Until Due *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.daysUntilDue}
                    onChange={(e) => setFormData({ ...formData, daysUntilDue: e.target.value })}
                    placeholder="30"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Early Payment Discount (Optional)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discountPercent}
                        onChange={(e) =>
                          setFormData({ ...formData, discountPercent: e.target.value })
                        }
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        If paid within (days)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.discountDays}
                        onChange={(e) => setFormData({ ...formData, discountDays: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

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
                    setEditingTerm(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingTerm ? handleUpdate : handleCreate}>
                  {editingTerm ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
