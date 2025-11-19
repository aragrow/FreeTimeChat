/**
 * Time Entry Detail Page
 *
 * View and edit individual time entry
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

interface TimeEntry {
  id: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  userId: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  isBillable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TimeEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getAuthHeaders, user } = useAuth();
  const { showToast } = useToast();

  const [entry, setEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine user role
  const isAdmin = user?.roles?.includes('admin');
  const isTenantAdmin = user?.roles?.includes('tenantadmin');
  const entryId = params.id as string;

  // Fetch time entry
  useEffect(() => {
    // Don't fetch if user is not loaded yet
    if (!user) {
      return;
    }

    fetchTimeEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, user]);

  const fetchTimeEntry = async () => {
    try {
      setIsLoading(true);

      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries/${entryId}`
          : `${process.env.NEXT_PUBLIC_API_URL}/time-entries/${entryId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setEntry(data.data);
      } else {
        const error = await response.json();
        showToast('error', error.message || 'Failed to fetch time entry');
        router.push('/time-entries');
      }
    } catch (error) {
      console.error('Failed to fetch time entry:', error);
      showToast('error', 'An error occurred while fetching the time entry');
      router.push('/time-entries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      setIsDeleting(true);

      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries/${entryId}`
          : `${process.env.NEXT_PUBLIC_API_URL}/time-entries/${entryId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        showToast('success', 'Time entry deleted successfully');
        router.push('/time-entries');
      } else {
        const error = await response.json();
        showToast('error', error.message || 'Failed to delete time entry');
      }
    } catch (error) {
      console.error('Failed to delete time entry:', error);
      showToast('error', 'An error occurred while deleting the time entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!entry) {
    return (
      <AppLayout>
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600">Time entry not found</p>
                <Button onClick={() => router.push('/time-entries')} className="mt-4">
                  Back to Time Entries
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Button variant="secondary" onClick={() => router.push('/time-entries')}>
                ← Back to Time Entries
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 mt-4">Time Entry Details</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          {/* Details Card */}
          <Card>
            <div className="space-y-6">
              {/* Project */}
              <div>
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {entry.project?.name || 'Unknown Project'}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900">
                  {entry.description || 'No description provided'}
                </p>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Start Time</label>
                  <p className="mt-1 text-gray-900">{formatDateTime(entry.startTime)}</p>
                  <p className="text-sm text-gray-500">{formatTime(entry.startTime)}</p>
                </div>
                {entry.endTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Time</label>
                    <p className="mt-1 text-gray-900">{formatDateTime(entry.endTime)}</p>
                    <p className="text-sm text-gray-500">{formatTime(entry.endTime)}</p>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatDuration(entry.duration)}
                </p>
              </div>

              {/* Billable */}
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {entry.isBillable ? (
                    <Badge variant="success">Billable</Badge>
                  ) : (
                    <Badge variant="default">Non-Billable</Badge>
                  )}
                  {!entry.endTime && (
                    <Badge variant="primary" className="ml-2">
                      Running
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span> {formatDateTime(entry.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {formatDateTime(entry.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
