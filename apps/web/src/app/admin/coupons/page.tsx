/**
 * Admin Coupons Page
 *
 * Manages promotional coupon codes for customers
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumAmount: number | null;
  maximumDiscount: number | null;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageLimitPerClient: number | null;
  usageCount: number;
  clientIds: string[];
  isActive: boolean;
  isFirstPurchase: boolean;
  createdAt: string;
  _count?: {
    redemptions: number;
  };
}

interface CouponStats {
  totalRedemptions: number;
  totalDiscountGiven: number;
  remainingUses: number | null;
}

export default function CouponsPage() {
  const { fetchWithAuth } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterValidNow, setFilterValidNow] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [viewingStats, setViewingStats] = useState<{ coupon: Coupon; stats: CouponStats } | null>(
    null
  );

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: '',
    minimumAmount: '',
    maximumDiscount: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    usageLimit: '',
    usageLimitPerClient: '',
    isActive: true,
    isFirstPurchase: false,
  });

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterActive, filterValidNow]);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filterActive && { isActive: filterActive }),
        ...(filterValidNow && { validNow: 'true' }),
      });

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/coupons?${params}`);

      if (response.ok) {
        const result = await response.json();
        setCoupons(result.data.coupons || []);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCouponStats = async (coupon: Coupon) => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/coupons/${coupon.id}/stats`);

      if (response.ok) {
        const result = await response.json();
        setViewingStats({ coupon, stats: result.data.statistics });
      }
    } catch (error) {
      console.error('Failed to fetch coupon stats:', error);
    }
  };

  const handleCreate = async () => {
    if (
      !formData.code ||
      !formData.name ||
      !formData.discountValue ||
      !formData.validFrom ||
      !formData.validUntil
    ) {
      alert('Code, name, discount value, valid from, and valid until are required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          name: formData.name,
          description: formData.description || null,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          minimumAmount: formData.minimumAmount ? parseFloat(formData.minimumAmount) : null,
          maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          usageLimitPerClient: formData.usageLimitPerClient
            ? parseInt(formData.usageLimitPerClient)
            : null,
          isActive: formData.isActive,
          isFirstPurchase: formData.isFirstPurchase,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchCoupons();
      } else {
        const errorData = await response.json();
        alert(`Failed to create coupon: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      alert('Failed to create coupon');
    }
  };

  const handleUpdate = async () => {
    if (!editingCoupon) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/coupons/${editingCoupon.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: formData.code.toUpperCase(),
            name: formData.name,
            description: formData.description || null,
            discountType: formData.discountType,
            discountValue: parseFloat(formData.discountValue),
            minimumAmount: formData.minimumAmount ? parseFloat(formData.minimumAmount) : null,
            maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
            validFrom: formData.validFrom,
            validUntil: formData.validUntil,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
            usageLimitPerClient: formData.usageLimitPerClient
              ? parseInt(formData.usageLimitPerClient)
              : null,
            isActive: formData.isActive,
            isFirstPurchase: formData.isFirstPurchase,
          }),
        }
      );

      if (response.ok) {
        setEditingCoupon(null);
        resetForm();
        fetchCoupons();
      } else {
        const errorData = await response.json();
        alert(`Failed to update coupon: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating coupon:', error);
      alert('Failed to update coupon');
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/coupons/${couponId}`, { method: 'DELETE' });

      if (response.ok) {
        fetchCoupons();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete coupon: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minimumAmount: '',
      maximumDiscount: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      usageLimit: '',
      usageLimitPerClient: '',
      isActive: true,
      isFirstPurchase: false,
    });
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minimumAmount: coupon.minimumAmount?.toString() || '',
      maximumDiscount: coupon.maximumDiscount?.toString() || '',
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil.split('T')[0],
      usageLimit: coupon.usageLimit?.toString() || '',
      usageLimitPerClient: coupon.usageLimitPerClient?.toString() || '',
      isActive: coupon.isActive,
      isFirstPurchase: coupon.isFirstPurchase,
    });
  };

  const formatDiscountValue = (coupon: Coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%`;
    }
    return `$${coupon.discountValue.toFixed(2)}`;
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    }

    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (now < validFrom) {
      return { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    }
    if (now > validUntil) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { label: 'Exhausted', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  if (isLoading && coupons.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-600">Manage promotional coupon codes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Coupon
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Search coupons..."
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
          <div className="flex items-center">
            <input
              id="validNow"
              type="checkbox"
              checked={filterValidNow}
              onChange={(e) => setFilterValidNow(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="validNow" className="ml-2 text-sm text-gray-700">
              Valid now only
            </label>
          </div>
        </div>
      </Card>

      {/* Coupons Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code / Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validity
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
              {coupons.map((coupon) => {
                const status = getCouponStatus(coupon);
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-mono font-bold text-gray-900">
                          {coupon.code}
                        </div>
                        <div className="text-sm text-gray-600">{coupon.name}</div>
                        {coupon.isFirstPurchase && (
                          <span className="text-xs text-purple-600">First purchase only</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDiscountValue(coupon)}
                      </span>
                      {coupon.maximumDiscount && (
                        <div className="text-xs text-gray-500">
                          Max: ${coupon.maximumDiscount.toFixed(2)}
                        </div>
                      )}
                      {coupon.minimumAmount && (
                        <div className="text-xs text-gray-500">
                          Min order: ${coupon.minimumAmount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(coupon.validFrom).toLocaleDateString()}</div>
                      <div className="text-gray-500">
                        to {new Date(coupon.validUntil).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.usageLimit ? (
                        <span>
                          {coupon.usageCount} / {coupon.usageLimit}
                        </span>
                      ) : (
                        <span>{coupon.usageCount} (unlimited)</span>
                      )}
                      {coupon.usageLimitPerClient && (
                        <div className="text-xs text-gray-500">
                          {coupon.usageLimitPerClient} per client
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => fetchCouponStats(coupon)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Stats"
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
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(coupon)}
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
                          onClick={() => handleDelete(coupon.id)}
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
                );
              })}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No coupons found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCoupon) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                    <Input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="SUMMER2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Summer Sale"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Summer promotion discount"
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
                      placeholder={formData.discountType === 'PERCENTAGE' ? '15' : '25.00'}
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
                      placeholder="50.00"
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
                      placeholder="100.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From *
                    </label>
                    <Input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until *
                    </label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Usage Limit
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Per Client Limit
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.usageLimitPerClient}
                      onChange={(e) =>
                        setFormData({ ...formData, usageLimitPerClient: e.target.value })
                      }
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
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
                  <div className="flex items-center">
                    <input
                      id="isFirstPurchase"
                      type="checkbox"
                      checked={formData.isFirstPurchase}
                      onChange={(e) =>
                        setFormData({ ...formData, isFirstPurchase: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFirstPurchase" className="ml-2 text-sm text-gray-700">
                      First purchase only
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingCoupon ? handleUpdate : handleCreate}>
                  {editingCoupon ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Stats Modal */}
      {viewingStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Coupon Statistics</h2>
              <p className="text-sm text-gray-600 mb-4">
                {viewingStats.coupon.code} - {viewingStats.coupon.name}
              </p>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Redemptions</span>
                  <span className="font-semibold">{viewingStats.stats.totalRedemptions}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Discount Given</span>
                  <span className="font-semibold">
                    ${Number(viewingStats.stats.totalDiscountGiven).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Remaining Uses</span>
                  <span className="font-semibold">
                    {viewingStats.stats.remainingUses !== null
                      ? viewingStats.stats.remainingUses
                      : 'Unlimited'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setViewingStats(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
