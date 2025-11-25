/**
 * Admin Expenses Page
 *
 * Manages expenses for the tenant including categories, attachments, and approval workflow
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

interface Product {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
}

interface ExpenseAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath: string | null;
  isReceipt: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  vendor: string | null;
  paymentMethod: string | null;
  reference: string | null;
  isReimbursable: boolean;
  isReimbursed: boolean;
  taxAmount: number | null;
  notes: string | null;
  status: string;
  categoryId: string;
  category: ExpenseCategory;
  clientId: string | null;
  client: Client | null;
  productId: string | null;
  product: Product | null;
  projectId: string | null;
  project: Project | null;
  attachments: ExpenseAttachment[];
  createdAt: string;
  createdBy: string;
}

interface ParsedReceiptData {
  vendor?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  paymentMethod?: string;
  reference?: string;
  taxAmount?: number;
  category?: string;
  categoryId?: string;
  confidence: number;
}

export default function ExpensesPage() {
  const { fetchWithAuth } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    clientId: '',
    productId: '',
    projectId: '',
    vendor: '',
    currency: 'USD',
    paymentMethod: '',
    reference: '',
    isReimbursable: false,
    taxAmount: '',
    notes: '',
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchClients();
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, filterStatus, filterCategoryId]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterCategoryId && { categoryId: filterCategoryId }),
      });

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses?${params}`);

      if (response.ok) {
        const result = await response.json();
        setExpenses(result.data.expenses || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/categories`);

      if (response.ok) {
        const result = await response.json();
        setCategories(result.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients?limit=100`);

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
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?limit=100`);

      if (response.ok) {
        const result = await response.json();
        setProjects(result.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const seedCategories = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/categories/seed`, { method: 'POST' });

      if (response.ok) {
        fetchCategories();
        alert('Default categories seeded successfully');
      }
    } catch (error) {
      console.error('Failed to seed categories:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.description || !formData.amount || !formData.categoryId) {
      alert('Description, amount, and category are required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          clientId: formData.clientId || null,
          productId: formData.productId || null,
          projectId: formData.projectId || null,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to create expense: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${editingExpense.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            clientId: formData.clientId || null,
            productId: formData.productId || null,
            projectId: formData.projectId || null,
          }),
        }
      );

      if (response.ok) {
        setEditingExpense(null);
        resetForm();
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to update expense: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${expenseId}`, { method: 'DELETE' });

      if (response.ok) {
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete expense: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleApprove = async (expenseId: string) => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${expenseId}/approve`, { method: 'POST' });

      if (response.ok) {
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to approve expense: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleReject = async (expenseId: string) => {
    const reason = prompt('Enter rejection reason (optional):');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/${expenseId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to reject expense: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParsedData(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('receipt', file);

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/parse-receipt`, { method: 'POST', body: formDataUpload,
        }
      );

      if (response.ok) {
        const result = await response.json();
        setParsedData(result.data);

        // Pre-fill form with parsed data
        setFormData({
          description: result.data.description || '',
          amount: result.data.amount?.toString() || '',
          expenseDate: result.data.date || new Date().toISOString().split('T')[0],
          categoryId: result.data.categoryId || '',
          clientId: '',
          productId: '',
          projectId: '',
          vendor: result.data.vendor || '',
          currency: result.data.currency || 'USD',
          paymentMethod: result.data.paymentMethod || '',
          reference: result.data.reference || '',
          isReimbursable: false,
          taxAmount: result.data.taxAmount?.toString() || '',
          notes: '',
        });
      } else {
        const errorData = await response.json();
        alert(`Failed to parse receipt: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error parsing receipt:', error);
      alert('Failed to parse receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFromReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('receipt', file);

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/expenses/create-from-receipt`, { method: 'POST', body: formDataUpload,
        }
      );

      if (response.ok) {
        setShowReceiptModal(false);
        fetchExpenses();
        alert('Expense created from receipt successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to create expense from receipt: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating expense from receipt:', error);
      alert('Failed to create expense from receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      categoryId: '',
      clientId: '',
      productId: '',
      projectId: '',
      vendor: '',
      currency: 'USD',
      paymentMethod: '',
      reference: '',
      isReimbursable: false,
      taxAmount: '',
      notes: '',
    });
    setParsedData(null);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate.split('T')[0],
      categoryId: expense.categoryId,
      clientId: expense.clientId || '',
      productId: expense.productId || '',
      projectId: expense.projectId || '',
      vendor: expense.vendor || '',
      currency: expense.currency,
      paymentMethod: expense.paymentMethod || '',
      reference: expense.reference || '',
      isReimbursable: expense.isReimbursable,
      taxAmount: expense.taxAmount?.toString() || '',
      notes: expense.notes || '',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PAID':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-600">Manage expenses and receipts</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={seedCategories}>
              Seed Categories
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowReceiptModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan Receipt
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCategoryId}
            onChange={(e) => {
              setFilterCategoryId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
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
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{expense.description}</div>
                    {expense.vendor && (
                      <div className="text-xs text-gray-500">{expense.vendor}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      style={{ backgroundColor: expense.category.color ? `${expense.category.color}20` : '#E5E7EB' }}
                    >
                      {expense.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {expense.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleReject(expense.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setViewingExpense(expense)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(expense)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No expenses found. Create one to get started.
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
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingExpense) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingExpense ? 'Edit Expense' : 'Create Expense'}
              </h2>

              {/* Receipt Upload for Create */}
              {showCreateModal && !parsedData && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Receipt (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {isUploading && <p className="mt-2 text-sm text-gray-500">Parsing receipt...</p>}
                </div>
              )}

              {parsedData && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  Receipt parsed with {Math.round(parsedData.confidence * 100)}% confidence
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <Input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Expense description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <Input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <Input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="Vendor/Merchant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    >
                      <option value="">Tenant-level</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    >
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="">Select method</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Check">Check</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="PayPal">PayPal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.taxAmount}
                      onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <Input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Receipt #"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="isReimbursable"
                      type="checkbox"
                      checked={formData.isReimbursable}
                      onChange={(e) =>
                        setFormData({ ...formData, isReimbursable: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isReimbursable" className="ml-2 text-sm text-gray-700">
                      Reimbursable expense
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingExpense ? handleUpdate : handleCreate}>
                  {editingExpense ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Receipt Upload Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Scan Receipt</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a receipt image and we&apos;ll automatically extract the expense details.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCreateFromReceipt}
                  disabled={isUploading}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {isUploading ? 'Processing...' : 'Click to upload receipt'}
                  </p>
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Expense Details</h2>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingExpense.status)}`}>
                  {viewingExpense.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Description</p>
                  <p className="font-medium">{viewingExpense.description}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(viewingExpense.amount, viewingExpense.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(viewingExpense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{viewingExpense.category.name}</p>
                </div>
                {viewingExpense.vendor && (
                  <div>
                    <p className="text-gray-500">Vendor</p>
                    <p className="font-medium">{viewingExpense.vendor}</p>
                  </div>
                )}
                {viewingExpense.paymentMethod && (
                  <div>
                    <p className="text-gray-500">Payment Method</p>
                    <p className="font-medium">{viewingExpense.paymentMethod}</p>
                  </div>
                )}
                {viewingExpense.client && (
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-medium">{viewingExpense.client.name}</p>
                  </div>
                )}
                {viewingExpense.project && (
                  <div>
                    <p className="text-gray-500">Project</p>
                    <p className="font-medium">{viewingExpense.project.name}</p>
                  </div>
                )}
              </div>

              {viewingExpense.notes && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Notes</p>
                  <p className="text-sm">{viewingExpense.notes}</p>
                </div>
              )}

              {viewingExpense.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingExpense.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 bg-gray-100 rounded px-3 py-1 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {attachment.fileName}
                        {attachment.isReceipt && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Receipt</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setViewingExpense(null)}>
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
