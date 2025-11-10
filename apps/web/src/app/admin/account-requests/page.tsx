/**
 * Account Requests List Page
 *
 * Displays all account requests with filtering and review actions
 */

'use client';

import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';

type AccountRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';

interface AccountRequest extends Record<string, unknown> {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  phone?: string;
  reasonForAccess: string;
  howHeardAboutUs?: string;
  status: AccountRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
  total: number;
}

interface ReviewModalData {
  requestId: string;
  fullName: string;
  email: string;
  action: 'approve' | 'reject' | 'spam';
}

export default function AccountRequestsPage() {
  const { getAuthHeaders } = useAuth();
  const { hasCapability } = useCapabilities();

  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    spam: 0,
    total: 0,
  });

  // Check capabilities
  const canRead = hasCapability('account-requests:read');
  const canApprove = hasCapability('account-requests:approve');
  const canReject = hasCapability('account-requests:reject');

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountRequestStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalData, setReviewModalData] = useState<ReviewModalData | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);

  useEffect(() => {
    if (canRead) {
      fetchAccountRequests();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, canRead]);

  const fetchAccountRequests = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/account-requests?${params}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAccountRequests(data.data.accountRequests || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch account requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/account-requests/stats`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAccountRequests();
  };

  const handleOpenReviewModal = (
    requestId: string,
    fullName: string,
    email: string,
    action: 'approve' | 'reject' | 'spam'
  ) => {
    setReviewModalData({ requestId, fullName, email, action });
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!reviewModalData) return;

    // Require review notes for reject action
    if (reviewModalData.action === 'reject' && !reviewNotes.trim()) {
      alert('Review notes are required when rejecting an account request.');
      return;
    }

    try {
      setIsSubmitting(true);

      const endpoint =
        reviewModalData.action === 'spam'
          ? `/admin/account-requests/${reviewModalData.requestId}/mark-spam`
          : `/admin/account-requests/${reviewModalData.requestId}/${reviewModalData.action}`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setShowReviewModal(false);
        setReviewModalData(null);
        setReviewNotes('');
        fetchAccountRequests();
        fetchStats();

        alert(
          `Account request successfully ${reviewModalData.action === 'approve' ? 'approved' : reviewModalData.action === 'spam' ? 'marked as spam' : 'rejected'}`
        );
      } else {
        const error = await response.json();
        alert(
          `Failed to ${reviewModalData.action} account request: ${error.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Failed to review account request:', error);
      alert('An error occurred while processing your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (request: AccountRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const getStatusBadgeClass = (status: AccountRequestStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'SPAM':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: TableColumn<AccountRequest>[] = [
    {
      key: 'fullName',
      header: 'Name',
      render: (request) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">{request.fullName}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{request.email}</span>
        </div>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      render: (request) => (
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-gray-100">{request.companyName}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{request.jobTitle}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (request) => (
        <span
          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(request.status)}`}
        >
          {request.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (request) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {formatDate(request.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (request) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleViewDetails(request)}>
            View
          </Button>
          {request.status === 'PENDING' && (
            <>
              {canApprove && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    handleOpenReviewModal(request.id, request.fullName, request.email, 'approve')
                  }
                >
                  Approve
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    handleOpenReviewModal(request.id, request.fullName, request.email, 'reject')
                  }
                >
                  Reject
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleOpenReviewModal(request.id, request.fullName, request.email, 'spam')
                  }
                >
                  Spam
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  if (!canRead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view account requests.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Account Requests</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review and manage account access requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</div>
          <div className="mt-1 text-3xl font-semibold text-yellow-600">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved</div>
          <div className="mt-1 text-3xl font-semibold text-green-600">{stats.approved}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</div>
          <div className="mt-1 text-3xl font-semibold text-red-600">{stats.rejected}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Spam</div>
          <div className="mt-1 text-3xl font-semibold text-gray-600">{stats.spam}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</div>
          <div className="mt-1 text-3xl font-semibold text-blue-600">{stats.total}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full sm:w-96"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AccountRequestStatus | 'all');
                setCurrentPage(1);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SPAM">Spam</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={accountRequests}
          keyExtractor={(request) => request.id}
          isLoading={isLoading}
          emptyMessage="No account requests found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  First
                </Button>
                <Button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
                <Button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {showReviewModal && reviewModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => !isSubmitting && setShowReviewModal(false)}
            />
            <Card className="relative z-10 w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {reviewModalData.action === 'approve'
                  ? 'Approve'
                  : reviewModalData.action === 'spam'
                    ? 'Mark as Spam'
                    : 'Reject'}{' '}
                Account Request
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Name:</strong> {reviewModalData.fullName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Email:</strong> {reviewModalData.email}
                </p>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="reviewNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Review Notes{' '}
                  {reviewModalData.action === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder={
                    reviewModalData.action === 'reject'
                      ? 'Please provide a reason for rejection...'
                      : 'Optional notes about this decision...'
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowReviewModal(false)}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  variant={
                    reviewModalData.action === 'approve'
                      ? 'primary'
                      : reviewModalData.action === 'spam'
                        ? 'outline'
                        : 'danger'
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => setShowDetailsModal(false)}
            />
            <Card className="relative z-10 w-full max-w-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Account Request Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(selectedRequest.status)}`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRequest.fullName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRequest.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRequest.companyName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Title
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRequest.jobTitle}</p>
                </div>

                {selectedRequest.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedRequest.phone}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason for Access
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedRequest.reasonForAccess}
                  </p>
                </div>

                {selectedRequest.howHeardAboutUs && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      How They Heard About Us
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {selectedRequest.howHeardAboutUs}
                    </p>
                  </div>
                )}

                {selectedRequest.reviewNotes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Review Notes
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {selectedRequest.reviewNotes}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Requested: {formatDate(selectedRequest.createdAt)}
                  </p>
                  {selectedRequest.reviewedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reviewed: {formatDate(selectedRequest.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={() => setShowDetailsModal(false)} variant="outline">
                  Close
                </Button>
                {selectedRequest.status === 'PENDING' && (
                  <>
                    {canApprove && (
                      <Button
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleOpenReviewModal(
                            selectedRequest.id,
                            selectedRequest.fullName,
                            selectedRequest.email,
                            'approve'
                          );
                        }}
                        variant="primary"
                      >
                        Approve
                      </Button>
                    )}
                    {canReject && (
                      <Button
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleOpenReviewModal(
                            selectedRequest.id,
                            selectedRequest.fullName,
                            selectedRequest.email,
                            'reject'
                          );
                        }}
                        variant="danger"
                      >
                        Reject
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
