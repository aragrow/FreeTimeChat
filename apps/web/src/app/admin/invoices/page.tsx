/**
 * Admin Invoices Page
 *
 * Manages invoices with line items, discounts, and coupons
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface InvoiceItem {
  id?: string;
  projectId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  note: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  client: Client | null;
  status: string;
  issueDate: string;
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
  termsAndConditions: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  paypalInvoiceUrl: string | null;
  createdAt: string;
}

interface Discount {
  id: string;
  name: string;
  code: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  isActive: boolean;
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minimumAmount: number | null;
  maximumDiscount: number | null;
  isActive: boolean;
}

interface PaymentTerm {
  id: string;
  name: string;
  daysUntilDue: number;
  discountPercent: number | null;
  discountDays: number | null;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PROCESSING: [
    'SENT_TO_CLIENT',
    'SENT_EMAIL',
    'SENT_MAIL',
    'SENT_PAYPAL',
    'SENT_STRIPE',
    'INVALID',
    'VOID',
    'CANCELLED',
  ],
  SENT_TO_CLIENT: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_EMAIL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_MAIL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_PAYPAL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_STRIPE: ['VOID', 'CANCELLED', 'COMPLETED'],
  INVALID: ['VOID'],
  VOID: [],
  CANCELLED: [],
  COMPLETED: [],
};

export default function InvoicesPage() {
  const { getAuthHeaders } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [_coupons, setCoupons] = useState<Coupon[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_searchTerm, _setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<Invoice | null>(null);
  const [changingStatus, setChangingStatus] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTermId: '',
    taxRate: '0',
    discountAmount: '0',
    note: '',
    termsAndConditions: '',
  });

  // Line items state
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Selected discount
  const [selectedDiscountId, setSelectedDiscountId] = useState('');

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    note: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchProjects();
    fetchDiscounts();
    fetchCoupons();
    fetchPaymentTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus, filterClientId]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterStatus && { status: filterStatus }),
        ...(filterClientId && { clientId: filterClientId }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/invoices?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setInvoices(result.data.invoices || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setProjects(result.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/discounts?isActive=true`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setDiscounts(result.data.discounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/coupons?isActive=true&validNow=true`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setCoupons(result.data.coupons || []);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  const fetchPaymentTerms = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/payment-terms?isActive=true`,
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
    }
  };

  // Calculate subtotal from line items
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  // Calculate total discount (from selected discount + coupon)
  const calculateTotalDiscount = () => {
    let discount = parseFloat(formData.discountAmount) || 0;

    // Add discount from selected discount
    if (selectedDiscountId) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
      if (selectedDiscount) {
        const subtotal = calculateSubtotal();
        if (selectedDiscount.discountType === 'PERCENTAGE') {
          discount += (subtotal * selectedDiscount.discountValue) / 100;
        } else {
          discount += selectedDiscount.discountValue;
        }
      }
    }

    // Add coupon discount
    discount += couponDiscount;

    return discount;
  };

  // Calculate tax
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = parseFloat(formData.taxRate) || 0;
    return (subtotal * taxRate) / 100;
  };

  // Calculate total
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateTotalDiscount();
    return Math.max(0, subtotal + tax - discount);
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
      const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice;
      newItems[index].amount = qty * price;
    }

    setLineItems(newItems);
  };

  // Add line item
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Apply payment term
  const applyPaymentTerm = (termId: string) => {
    setFormData({ ...formData, paymentTermId: termId });
    const term = paymentTerms.find((t) => t.id === termId);
    if (term) {
      const issueDate = new Date(formData.issueDate);
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + term.daysUntilDue);
      setFormData((prev) => ({
        ...prev,
        paymentTermId: termId,
        dueDate: dueDate.toISOString().split('T')[0],
      }));
    }
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/coupons/validate`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          amount: calculateSubtotal(),
          clientId: formData.clientId || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAppliedCoupon(result.data.coupon);
        setCouponDiscount(result.data.discountAmount);
        alert(`Coupon applied! Discount: $${result.data.discountAmount.toFixed(2)}`);
      } else {
        const errorData = await response.json();
        alert(`Invalid coupon: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      alert('Failed to apply coupon');
    }
  };

  // Remove coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
  };

  // Create invoice
  const handleCreate = async () => {
    if (!formData.clientId) {
      alert('Please select a client');
      return;
    }

    if (lineItems.length === 0 || lineItems.every((item) => !item.description)) {
      alert('Please add at least one line item');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/invoices`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          items: lineItems
            .filter((item) => item.description)
            .map((item) => ({
              projectId: item.projectId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          issueDate: formData.issueDate,
          dueDate: formData.dueDate || undefined,
          taxRate: parseFloat(formData.taxRate) || 0,
          discountAmount: calculateTotalDiscount(),
          note: formData.note || null,
          termsAndConditions: formData.termsAndConditions || null,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchInvoices();
        alert('Invoice created successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to create invoice: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    }
  };

  // Record payment
  const handleRecordPayment = async () => {
    if (!recordingPayment || !paymentForm.amount) {
      alert('Payment amount is required');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/${recordingPayment.id}/record-payment`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(paymentForm.amount),
            paymentDate: paymentForm.paymentDate,
            paymentMethod: paymentForm.paymentMethod,
            note: paymentForm.note || null,
          }),
        }
      );

      if (response.ok) {
        setRecordingPayment(null);
        setPaymentForm({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'BANK_TRANSFER',
          note: '',
        });
        fetchInvoices();
        alert('Payment recorded successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to record payment: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  // Send via PayPal
  const handleSendPayPal = async (invoiceId: string) => {
    if (!confirm('Send this invoice via PayPal?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/${invoiceId}/send-paypal`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchInvoices();
        alert('Invoice sent via PayPal successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to send invoice: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentTermId: '',
      taxRate: '0',
      discountAmount: '0',
      note: '',
      termsAndConditions: '',
    });
    setLineItems([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    setSelectedDiscountId('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'SENT_TO_CLIENT':
        return 'bg-purple-100 text-purple-800';
      case 'SENT_EMAIL':
        return 'bg-indigo-100 text-indigo-800';
      case 'SENT_MAIL':
        return 'bg-cyan-100 text-cyan-800';
      case 'SENT_PAYPAL':
        return 'bg-sky-100 text-sky-800';
      case 'SENT_STRIPE':
        return 'bg-violet-100 text-violet-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'INVALID':
        return 'bg-orange-100 text-orange-800';
      case 'VOID':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status change
  const handleStatusChange = async () => {
    if (!changingStatus || !newStatus) {
      alert('Please select a new status');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/${changingStatus.id}/status`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setChangingStatus(null);
        setNewStatus('');
        fetchInvoices();
        alert('Status updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to update status: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // Handle invoice edit
  const handleEdit = async () => {
    if (!editingInvoice) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/${editingInvoice.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: lineItems
              .filter((item) => item.description)
              .map((item) => ({
                projectId: item.projectId || null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            issueDate: formData.issueDate,
            dueDate: formData.dueDate || undefined,
            taxRate: parseFloat(formData.taxRate) || 0,
            discountAmount: calculateTotalDiscount(),
            note: formData.note || null,
            termsAndConditions: formData.termsAndConditions || null,
          }),
        }
      );

      if (response.ok) {
        setEditingInvoice(null);
        resetForm();
        fetchInvoices();
        alert('Invoice updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to update invoice: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice');
    }
  };

  // Open edit modal with invoice data
  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      clientId: invoice.clientId || '',
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate.split('T')[0],
      paymentTermId: '',
      taxRate: invoice.taxRate.toString(),
      discountAmount: invoice.discountAmount.toString(),
      note: invoice.note || '',
      termsAndConditions: invoice.termsAndConditions || '',
    });
    setLineItems(
      invoice.items.map((item) => ({
        id: item.id,
        projectId: item.projectId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      }))
    );
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('invoices.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoices.title')}</h1>
          <p className="text-sm text-gray-600">{t('invoices.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/invoices/generate')}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('invoices.generateFromTime')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('invoices.createInvoice')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{t('invoices.allStatuses')}</option>
            <option value="PROCESSING">{t('invoices.status.processing')}</option>
            <option value="SENT_TO_CLIENT">{t('invoices.status.sentToClient')}</option>
            <option value="SENT_EMAIL">{t('invoices.status.sentEmail')}</option>
            <option value="SENT_MAIL">{t('invoices.status.sentMail')}</option>
            <option value="SENT_PAYPAL">{t('invoices.status.sentPaypal')}</option>
            <option value="SENT_STRIPE">{t('invoices.status.sentStripe')}</option>
            <option value="COMPLETED">{t('invoices.status.completed')}</option>
            <option value="INVALID">{t('invoices.status.invalid')}</option>
            <option value="VOID">{t('invoices.status.void')}</option>
            <option value="CANCELLED">{t('invoices.status.cancelled')}</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterClientId}
            onChange={(e) => {
              setFilterClientId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{t('invoices.allClients')}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoices.invoice')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoices.client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoices.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoices.dueDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('invoices.status.label')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    {invoice.amountDue > 0 && invoice.amountDue !== invoice.totalAmount && (
                      <div className="text-xs text-red-600">
                        Due: {formatCurrency(invoice.amountDue)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}
                    >
                      {formatStatus(invoice.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewingInvoice(invoice)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View"
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      {invoice.status === 'PROCESSING' && (
                        <button
                          onClick={() => openEditModal(invoice)}
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
                      )}
                      {STATUS_TRANSITIONS[invoice.status]?.length > 0 && (
                        <button
                          onClick={() => {
                            setChangingStatus(invoice);
                            setNewStatus('');
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Change Status"
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      )}
                      {invoice.status === 'PROCESSING' && (
                        <button
                          onClick={() => handleSendPayPal(invoice.id)}
                          className="text-sky-600 hover:text-sky-900"
                          title="Send via PayPal"
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
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      )}
                      {invoice.status.startsWith('SENT_') && invoice.amountDue > 0 && (
                        <button
                          onClick={() => {
                            setRecordingPayment(invoice);
                            setPaymentForm({
                              amount: invoice.amountDue.toString(),
                              paymentDate: new Date().toISOString().split('T')[0],
                              paymentMethod: 'BANK_TRANSFER',
                              note: '',
                            });
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Record Payment"
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
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {t('invoices.noInvoices')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="text-sm text-gray-600">
              {t('common.pageOf', { current: currentPage, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </Card>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('invoices.createInvoice')}</h2>

              <div className="space-y-6">
                {/* Client and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('invoices.client')} *
                    </label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <Input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.paymentTermId}
                      onChange={(e) => applyPaymentTerm(e.target.value)}
                    >
                      <option value="">Select terms</option>
                      {paymentTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.dueDate && (
                  <div className="text-sm text-gray-600">
                    Due Date: {new Date(formData.dueDate).toLocaleDateString()}
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Line Items *</label>
                    <Button variant="outline" size="sm" onClick={addLineItem}>
                      + Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                          )}
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </div>
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Project</label>
                          )}
                          <select
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                            value={item.projectId || ''}
                            onChange={(e) => updateLineItem(index, 'projectId', e.target.value)}
                          >
                            <option value="">None</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Amount</label>
                          )}
                          <span className="text-sm font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                        <div className="col-span-1">
                          {lineItems.length > 1 && (
                            <button
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-900 p-1"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discounts and Coupons */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Discounts & Coupons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Apply Discount</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedDiscountId}
                        onChange={(e) => setSelectedDiscountId(e.target.value)}
                      >
                        <option value="">No discount</option>
                        {discounts.map((discount) => (
                          <option key={discount.id} value={discount.id}>
                            {discount.name} (
                            {discount.discountType === 'PERCENTAGE'
                              ? `${discount.discountValue}%`
                              : `$${discount.discountValue}`}
                            )
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Coupon Code</label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          disabled={!!appliedCoupon}
                        />
                        {appliedCoupon ? (
                          <Button variant="outline" size="sm" onClick={removeCoupon}>
                            Remove
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={applyCoupon}>
                            Apply
                          </Button>
                        )}
                      </div>
                      {appliedCoupon && (
                        <p className="text-xs text-green-600 mt-1">
                          {appliedCoupon.name} - Saving ${couponDiscount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">
                      Additional Discount ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                      className="max-w-xs"
                    />
                  </div>
                </div>

                {/* Tax */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="max-w-xs"
                  />
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {calculateTotalDiscount() > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(calculateTotalDiscount())}</span>
                    </div>
                  )}
                  {calculateTax() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({formData.taxRate}%):</span>
                      <span className="font-medium">{formatCurrency(calculateTax())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Additional notes for the client..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate}>{t('invoices.createInvoice')}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{viewingInvoice.invoiceNumber}</h2>
                  <p className="text-sm text-gray-600">{viewingInvoice.client?.name}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(viewingInvoice.status)}`}
                >
                  {viewingInvoice.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-500">Issue Date</p>
                  <p className="font-medium">
                    {new Date(viewingInvoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium">
                    {new Date(viewingInvoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right py-2">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewingInvoice.subtotal)}</span>
                </div>
                {viewingInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(viewingInvoice.discountAmount)}</span>
                  </div>
                )}
                {viewingInvoice.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({viewingInvoice.taxRate}%):</span>
                    <span>{formatCurrency(viewingInvoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(viewingInvoice.totalAmount)}</span>
                </div>
                {viewingInvoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>{formatCurrency(viewingInvoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Amount Due:</span>
                      <span>{formatCurrency(viewingInvoice.amountDue)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Payments */}
              {viewingInvoice.payments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Payments</h3>
                  <div className="space-y-2">
                    {viewingInvoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                      >
                        <span>
                          {new Date(payment.paymentDate).toLocaleDateString()} -{' '}
                          {payment.paymentMethod}
                        </span>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingInvoice.note && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Notes</h3>
                  <p className="text-sm text-gray-600">{viewingInvoice.note}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingInvoice(null)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('invoices.recordPayment')}</h2>
              <p className="text-sm text-gray-600 mb-4">
                Invoice: {recordingPayment.invoiceNumber}
                <br />
                Amount Due: {formatCurrency(recordingPayment.amountDue)}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={recordingPayment.amountDue}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <Input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder="Optional note..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setRecordingPayment(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleRecordPayment}>{t('invoices.recordPayment')}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t('invoices.editInvoice')} - {editingInvoice.invoiceNumber}
              </h2>

              <div className="space-y-6">
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <Input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Line Items *</label>
                    <Button variant="outline" size="sm" onClick={addLineItem}>
                      + Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                          )}
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </div>
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          {index === 0 && (
                            <label className="block text-xs text-gray-500 mb-1">Amount</label>
                          )}
                          <span className="text-sm font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                        <div className="col-span-1">
                          {lineItems.length > 1 && (
                            <button
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-900 p-1"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax and Discount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {calculateTotalDiscount() > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(calculateTotalDiscount())}</span>
                    </div>
                  )}
                  {calculateTax() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({formData.taxRate}%):</span>
                      <span className="font-medium">{formatCurrency(calculateTax())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Additional notes for the client..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingInvoice(null);
                    resetForm();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleEdit}>{t('common.saveChanges')}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Change Status Modal */}
      {changingStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('invoices.changeStatus')}</h2>
              <p className="text-sm text-gray-600 mb-4">
                Invoice: {changingStatus.invoiceNumber}
                <br />
                Current Status:{' '}
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(changingStatus.status)}`}
                >
                  {formatStatus(changingStatus.status)}
                </span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select new status</option>
                  {STATUS_TRANSITIONS[changingStatus.status]?.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingStatus(null);
                    setNewStatus('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleStatusChange} disabled={!newStatus}>
                  {t('invoices.updateStatus')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
