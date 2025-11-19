/**
 * Admin Bills Page
 *
 * Manages bills from vendors for Account Payables
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
}

interface BillItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  expenseCategoryId?: string | null;
  projectId?: string | null;
}

interface BillPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string | null;
  referenceNumber: string | null;
  note: string | null;
}

interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor: Vendor;
  vendorInvoiceNo: string | null;
  status: string;
  billDate: string;
  dueDate: string;
  paidDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  note: string | null;
  items?: BillItem[];
  payments?: BillPayment[];
  createdAt: string;
}

const PAYMENT_METHODS = [
  'CASH',
  'CHECK',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'WIRE',
  'ACH',
  'OTHER',
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  RECEIVED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-yellow-100 text-yellow-800',
  PARTIAL_PAID: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

export default function BillsPage() {
  const { getAuthHeaders } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    vendorId: '',
    vendorInvoiceNo: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: '0',
    discountAmount: '0',
    note: '',
  });

  const [lineItems, setLineItems] = useState<BillItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  // Payment form
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    transactionId: '',
    referenceNumber: '',
    note: '',
  });

  useEffect(() => {
    fetchBills();
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, vendorFilter]);

  const fetchBills = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(vendorFilter && { vendorId: vendorFilter }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bills?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setBills(result.data.bills || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/vendors?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setVendors(result.data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const resetFormData = () => {
    setFormData({
      vendorId: '',
      vendorInvoiceNo: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxRate: '0',
      discountAmount: '0',
      note: '',
    });
    setLineItems([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const calculateLineItemAmount = (index: number) => {
    const item = lineItems[index];
    const amount = item.quantity * item.unitPrice;
    const newItems = [...lineItems];
    newItems[index] = { ...item, amount };
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (parseFloat(formData.taxRate) / 100);
    const total = subtotal + taxAmount - parseFloat(formData.discountAmount || '0');
    return { subtotal, taxAmount, total };
  };

  const handleCreate = async () => {
    if (!formData.vendorId) {
      alert('Vendor is required');
      return;
    }
    if (!formData.billDate || !formData.dueDate) {
      alert('Bill date and due date are required');
      return;
    }
    if (lineItems.every((item) => !item.description)) {
      alert('At least one line item is required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bills`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: lineItems.filter((item) => item.description),
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetFormData();
        fetchBills();
      } else {
        const errorData = await response.json();
        alert(`Failed to create bill: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Failed to create bill');
    }
  };

  const handleUpdate = async () => {
    if (!editingBill) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/bills/${editingBill.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            items: lineItems.filter((item) => item.description),
          }),
        }
      );

      if (response.ok) {
        setEditingBill(null);
        resetFormData();
        fetchBills();
      } else {
        const errorData = await response.json();
        alert(`Failed to update bill: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Failed to update bill');
    }
  };

  const handleRecordPayment = async () => {
    if (!payingBill) return;

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Payment amount is required');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/bills/${payingBill.id}/payments`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (response.ok) {
        setShowPaymentModal(false);
        setPayingBill(null);
        setPaymentData({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'BANK_TRANSFER',
          transactionId: '',
          referenceNumber: '',
          note: '',
        });
        fetchBills();
      } else {
        const errorData = await response.json();
        alert(`Failed to record payment: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const handleApprove = async (billId: string) => {
    if (!confirm('Approve this bill for payment?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/bills/${billId}/approve`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchBills();
      } else {
        const errorData = await response.json();
        alert(`Failed to approve bill: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error approving bill:', error);
    }
  };

  const handleDelete = async (billId: string, billNumber: string) => {
    if (!confirm(`Delete bill "${billNumber}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bills/${billId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchBills();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete bill: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const openEditModal = async (bill: Bill) => {
    // Fetch full bill details
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bills/${bill.id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const fullBill = result.data;

        setEditingBill(fullBill);
        setFormData({
          vendorId: fullBill.vendorId,
          vendorInvoiceNo: fullBill.vendorInvoiceNo || '',
          billDate: new Date(fullBill.billDate).toISOString().split('T')[0],
          dueDate: new Date(fullBill.dueDate).toISOString().split('T')[0],
          taxRate: fullBill.taxRate?.toString() || '0',
          discountAmount: fullBill.discountAmount?.toString() || '0',
          note: fullBill.note || '',
        });
        setLineItems(
          fullBill.items?.length > 0
            ? fullBill.items.map((item: BillItem) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                amount: Number(item.amount),
              }))
            : [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]
        );
      }
    } catch (error) {
      console.error('Error fetching bill details:', error);
    }
  };

  const openPaymentModal = (bill: Bill) => {
    setPayingBill(bill);
    setPaymentData({
      amount: bill.amountDue.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      transactionId: '',
      referenceNumber: '',
      note: '',
    });
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-600 mt-1">Manage vendor bills for Account Payables</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Bill
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search by bill number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="RECEIVED">Received</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIAL_PAID">Partial Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="w-48">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Bills Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bill #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Due
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
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(bill)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {bill.billNumber}
                    </button>
                    {bill.vendorInvoiceNo && (
                      <div className="text-xs text-gray-500">Ref: {bill.vendorInvoiceNo}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{bill.vendor?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(bill.billDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(bill.dueDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(Number(bill.totalAmount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(Number(bill.amountDue))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[bill.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {bill.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {bill.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprove(bill.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                      )}
                      {['APPROVED', 'PARTIAL_PAID'].includes(bill.status) && (
                        <button
                          onClick={() => openPaymentModal(bill)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(bill)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        View
                      </button>
                      {bill.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDelete(bill.id, bill.billNumber)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No bills found. Click &quot;New Bill&quot; to create one.
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

      {/* Create/Edit Modal */}
      {(showCreateModal || editingBill) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">
              {editingBill ? `Edit Bill ${editingBill.billNumber}` : 'Create New Bill'}
            </h2>

            {/* Bill Details */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Bill Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingBill}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Invoice #
                  </label>
                  <Input
                    type="text"
                    value={formData.vendorInvoiceNo}
                    onChange={(e) => setFormData({ ...formData, vendorInvoiceNo: e.target.value })}
                    placeholder="Vendor's invoice number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  Add Item
                </Button>
              </div>
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description
                      </label>
                    )}
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...lineItems];
                        newItems[index].description = e.target.value;
                        setLineItems(newItems);
                      }}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                    )}
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...lineItems];
                        newItems[index].quantity = parseFloat(e.target.value) || 0;
                        calculateLineItemAmount(index);
                      }}
                      onBlur={() => calculateLineItemAmount(index)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...lineItems];
                        newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                        calculateLineItemAmount(index);
                      }}
                      onBlur={() => calculateLineItemAmount(index)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                    )}
                    <Input type="text" value={formatCurrency(item.amount)} disabled />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeLineItem(index)}
                      className="p-2 text-red-600 hover:text-red-900"
                      disabled={lineItems.length === 1}
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
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Totals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                  />
                </div>
                <div className="text-right space-y-1 pt-6">
                  <div className="text-sm text-gray-600">Subtotal: {formatCurrency(subtotal)}</div>
                  <div className="text-sm text-gray-600">Tax: {formatCurrency(taxAmount)}</div>
                  <div className="text-lg font-bold">Total: {formatCurrency(total)}</div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Notes</h3>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingBill(null);
                  resetFormData();
                }}
              >
                Cancel
              </Button>
              <Button onClick={editingBill ? handleUpdate : handleCreate}>
                {editingBill ? 'Update' : 'Create'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && payingBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6">Record Payment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Bill: {payingBill.billNumber} | Amount Due:{' '}
              {formatCurrency(Number(payingBill.amountDue))}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference/Check #
                </label>
                <Input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, referenceNumber: e.target.value })
                  }
                  placeholder="Check number, reference, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={paymentData.note}
                  onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                  placeholder="Payment note..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPayingBill(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRecordPayment}>Record Payment</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
