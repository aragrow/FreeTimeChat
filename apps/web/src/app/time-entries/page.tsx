/**
 * Time Entries Page
 *
 * Unified time entries management for all user roles
 * - Regular users: view/manage own entries
 * - Tenant admins: view/manage entries for users in their tenant
 * - System admins: view/manage entries across all tenants (with tenant selection)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { useNavigation } from '@/contexts/NavigationContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface TimeEntry extends Record<string, unknown> {
  id: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isRunning: boolean;
  userId: string;
  userName?: string;
  userEmail?: string;
  projectId: string;
  projectName?: string;
  clientName?: string;
  isBillable?: boolean;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  tenantKey: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function TimeEntriesPage() {
  const { fetchWithAuth, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { isNavItemEnabled } = useNavigation();

  // Determine user role
  const isAdmin = user?.roles?.includes('admin');
  const isTenantAdmin = user?.roles?.includes('tenantadmin');

  // State
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [billableFilter, setbillableFilter] = useState<'all' | 'billable' | 'non-billable'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [runningEntryId, setRunningEntryId] = useState<string | null>(null);

  // Admin-specific state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);

  // Get user's tracking mode (default to CLOCK if not set)
  const userTrackingMode = user?.trackingMode || 'CLOCK';
  const canUseClock = userTrackingMode === 'CLOCK';
  const canUseManual = userTrackingMode === 'TIME';

  // Fetch tenants (admin only)
  useEffect(() => {
    if (isAdmin) {
      fetchTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Fetch users when tenant is selected (admin and tenant admin)
  useEffect(() => {
    // Don't fetch if user is not loaded yet
    if (!user) {
      return;
    }

    if (isAdmin || isTenantAdmin) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant, isAdmin, isTenantAdmin, user]);

  // Fetch time entries
  useEffect(() => {
    // Don't fetch if user is not loaded yet
    if (!user) {
      return;
    }

    if (isAdmin && !selectedTenant) {
      // Admin must select a tenant first
      return;
    }
    fetchTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, userFilter, startDate, endDate, selectedTenant, user]);

  const fetchTenants = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`);

      if (response.ok) {
        const data = await response.json();
        const tenantsList = data.data.tenants || [];
        setTenants(tenantsList);
        // Auto-select first tenant
        if (tenantsList.length > 0) {
          setSelectedTenant(tenantsList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users?limit=1000`
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(userFilter !== 'all' && { userId: userFilter }),
      });

      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries`
          : `${process.env.NEXT_PUBLIC_API_URL}/time-entries`;

      const response = await fetchWithAuth(`${endpoint}?${params}`);

      if (response.ok) {
        const data = await response.json();
        // Handle different response structures
        const entries = isAdmin || isTenantAdmin ? data.data.entries || [] : data.data || [];

        // Map the API response to match our frontend interface
        const mappedEntries = entries.map(
          (entry: {
            id: string;
            description?: string;
            startTime: string;
            endTime?: string;
            duration?: number;
            userId: string;
            projectId: string;
            project?: { name?: string; client?: { name?: string } };
            isBillable?: boolean;
            createdAt: string;
          }) => ({
            id: entry.id,
            description: entry.description || 'No description',
            startTime: entry.startTime,
            endTime: entry.endTime,
            duration: entry.duration ? Math.floor(entry.duration / 60) : 0, // Convert seconds to minutes
            isRunning: !entry.endTime,
            userId: entry.userId,
            userName: 'Unknown User', // TODO: Get from main DB
            userEmail: entry.userId, // Placeholder
            projectId: entry.projectId,
            projectName: entry.project?.name || 'No Project',
            clientName: entry.project?.client?.name || null,
            isBillable: entry.isBillable,
            createdAt: entry.createdAt,
          })
        );
        setEntries(mappedEntries);
        setTotalPages(data.data.pagination?.totalPages || 1);

        // Check if user has a running entry (clocked in)
        const runningEntry = mappedEntries.find(
          (entry: TimeEntry) => entry.isRunning && entry.userId === user?.id
        );
        setIsClockedIn(!!runningEntry);
        setRunningEntryId(runningEntry?.id || null);
      } else {
        showToast('error', 'Failed to load time entries');
      }
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
      showToast('error', 'An error occurred while loading time entries');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchTerm === '' ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (entry.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (entry.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'running' && entry.isRunning) ||
      (statusFilter === 'stopped' && !entry.isRunning);

    const matchesBillable =
      billableFilter === 'all' ||
      (billableFilter === 'billable' && entry.isBillable === true) ||
      (billableFilter === 'non-billable' && entry.isBillable === false);

    return matchesSearch && matchesStatus && matchesBillable;
  });

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleStopTimer = async (entryId: string) => {
    try {
      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries/${entryId}/stop`
          : `${process.env.NEXT_PUBLIC_API_URL}/time-entries/${entryId}/stop`;

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('success', 'Timer stopped successfully');
        fetchTimeEntries();
      } else {
        const error = await response.json();
        showToast('error', error.message || 'Failed to stop timer');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      showToast('error', 'An error occurred while stopping the timer');
    }
  };

  const handleClockIn = async () => {
    // For now, redirect to new time entry page
    // In the future, we could auto-create a time entry with no end time
    router.push('/time-entries/new');
  };

  const handleClockOut = async () => {
    if (!runningEntryId) {
      showToast('error', 'No active time entry found');
      return;
    }
    await handleStopTimer(runningEntryId);
  };

  // Build columns based on user role
  const buildColumns = (): TableColumn<TimeEntry>[] => {
    const baseColumns: TableColumn<TimeEntry>[] = [];

    // User column (only for admins and tenant admins)
    if (isAdmin || isTenantAdmin) {
      baseColumns.push({
        key: 'userName',
        header: t('timeEntries.user'),
        sortable: true,
        render: (entry) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
              {entry.userName?.charAt(0) || 'U'}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">
                {entry.userName || 'Unknown'}
              </span>
              <p className="text-xs text-gray-500">{entry.userEmail}</p>
            </div>
          </div>
        ),
      });
    }

    // Project column
    baseColumns.push({
      key: 'projectName',
      header: t('timeEntries.project'),
      sortable: true,
      render: (entry) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {entry.clientName ? `${entry.clientName} - ` : ''}
              {entry.projectName || t('projects.noClient')}
            </span>
          </div>
          <div className="mt-1">
            {entry.isBillable ? (
              <Badge variant="success" size="sm">
                {t('timeEntries.billable')}
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Non-Billable
              </Badge>
            )}
          </div>
        </div>
      ),
    });

    // Description
    baseColumns.push({
      key: 'description',
      header: t('timeEntries.description'),
      sortable: true,
      render: (entry) => (
        <p className="text-sm text-gray-900 max-w-md truncate">{entry.description}</p>
      ),
    });

    // Start Time
    baseColumns.push({
      key: 'startTime',
      header: t('timeEntries.startTime'),
      sortable: true,
      render: (entry) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{formatDate(entry.startTime)}</p>
          <p className="text-xs text-gray-500">{formatTime(entry.startTime)}</p>
        </div>
      ),
    });

    // End Time
    baseColumns.push({
      key: 'endTime',
      header: t('timeEntries.endTime'),
      sortable: true,
      render: (entry) =>
        entry.endTime ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{formatDate(entry.endTime)}</p>
            <p className="text-xs text-gray-500">{formatTime(entry.endTime)}</p>
          </div>
        ) : (
          <Badge variant="success" className="animate-pulse">
            {t('timeEntries.running')}
          </Badge>
        ),
    });

    // Duration
    baseColumns.push({
      key: 'duration',
      header: t('timeEntries.duration'),
      sortable: true,
      render: (entry) => (
        <span className="text-sm font-medium text-gray-900">{formatDuration(entry.duration)}</span>
      ),
    });

    // Actions
    baseColumns.push({
      key: 'actions',
      header: t('common.actions'),
      render: (entry) => (
        <div className="flex items-center gap-2">
          {entry.isRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleStopTimer(entry.id);
              }}
            >
              {t('timeEntries.stop')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/time-entries/${entry.id}`);
            }}
          >
            {isAdmin || isTenantAdmin ? t('common.edit') : t('common.view')}
          </Button>
        </div>
      ),
    });

    return baseColumns;
  };

  const totalHours = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  const runningEntries = entries.filter((e) => e.isRunning).length;
  const billableHours =
    entries.filter((e) => e.isBillable).reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;

  // Get page title based on role
  const getPageTitle = () => {
    if (isAdmin) return t('timeEntries.management');
    if (isTenantAdmin) return t('timeEntries.teamEntries');
    return t('timeEntries.myEntries');
  };

  // Get page description based on role
  const getPageDescription = () => {
    if (isAdmin) return t('timeEntries.allTenantsDesc');
    if (isTenantAdmin) return t('timeEntries.teamDesc');
    return t('timeEntries.trackDesc');
  };

  return (
    <AppLayout title="Time Entries" showHeader={false}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-gray-600 mt-1">{getPageDescription()}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Chat Button - Only show if tenant has chat enabled */}
                {isNavItemEnabled('chat') && (
                  <Button variant="secondary" onClick={() => router.push('/chat')}>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    {t('nav.chat')}
                  </Button>
                )}

                {/* Tracking Mode Based Buttons - Only show for regular users (not admins) */}
                {!isAdmin && !isTenantAdmin && (
                  <>
                    {/* Clock In/Out Button */}
                    {canUseClock && (
                      <Button
                        onClick={isClockedIn ? handleClockOut : handleClockIn}
                        variant={isClockedIn ? 'danger' : 'primary'}
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {isClockedIn ? t('timeEntries.clockOut') : t('timeEntries.clockIn')}
                      </Button>
                    )}

                    {/* Manual Entry Button */}
                    {canUseManual && (
                      <Button onClick={() => router.push('/time-entries/new')}>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01"
                          />
                        </svg>
                        {t('timeEntries.addManual')}
                      </Button>
                    )}
                  </>
                )}

                {/* Admin/Tenant Admin Add Button */}
                {(isAdmin || isTenantAdmin) && selectedTenant && (
                  <Button onClick={() => router.push('/time-entries/new')}>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    {t('timeEntries.addEntry')}
                  </Button>
                )}
              </div>
            </div>

            {/* Tenant Selection (Admin Only) */}
            {isAdmin && (
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {t('timeEntries.selectTenant')}
                  </label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => {
                      setSelectedTenant(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('timeEntries.selectTenantDefault')}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.tenantKey})
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            )}

            {/* Show message if admin hasn't selected a tenant */}
            {isAdmin && !selectedTenant ? (
              <Card className="p-8">
                <EmptyState
                  icon="building"
                  title={t('timeEntries.selectTenantToView')}
                  description={t('timeEntries.selectTenantHint')}
                />
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('timeEntries.totalHours')}</p>
                        <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('timeEntries.runningTimers')}</p>
                        <p className="text-2xl font-bold text-gray-900">{runningEntries}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('timeEntries.billableHours')}</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {billableHours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                  </Card>

                  {(isAdmin || isTenantAdmin) && (
                    <Card className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-orange-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{t('timeEntries.totalEntries')}</p>
                          <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Filters */}
                <Card className="p-4">
                  <div className="space-y-4">
                    {/* First Row: Search and Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input
                        type="text"
                        placeholder={t('timeEntries.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />

                      {/* User Filter (Admin and Tenant Admin only) */}
                      {(isAdmin || isTenantAdmin) && (
                        <select
                          value={userFilter}
                          onChange={(e) => setUserFilter(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">{t('timeEntries.allUsers')}</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </option>
                          ))}
                        </select>
                      )}

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">{t('timeEntries.allStatus')}</option>
                        <option value="running">{t('timeEntries.running')}</option>
                        <option value="stopped">{t('timeEntries.stop')}</option>
                      </select>

                      <select
                        value={billableFilter}
                        onChange={(e) => setbillableFilter(e.target.value as typeof billableFilter)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Billability</option>
                        <option value="billable">Billable Only</option>
                        <option value="non-billable">Non-Billable Only</option>
                      </select>
                    </div>

                    {/* Second Row: Date Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date"
                      />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date"
                      />
                    </div>
                  </div>
                </Card>

                {/* Time Entries Table */}
                {filteredEntries.length === 0 && !isLoading ? (
                  <Card className="p-8">
                    <EmptyState
                      icon="clock"
                      title={t('timeEntries.noEntries')}
                      description={t('timeEntries.noEntriesHint')}
                      action={{
                        label: t('timeEntries.addEntry'),
                        onClick: () => router.push('/time-entries/new'),
                      }}
                      secondaryAction={
                        isNavItemEnabled('chat')
                          ? {
                              label: t('nav.chat'),
                              onClick: () => router.push('/chat'),
                            }
                          : undefined
                      }
                    />
                  </Card>
                ) : (
                  <Table<TimeEntry>
                    columns={buildColumns()}
                    data={filteredEntries}
                    keyExtractor={(entry) => entry.id}
                    onRowClick={(entry) => router.push(`/time-entries/${entry.id}`)}
                    isLoading={isLoading}
                    emptyMessage="No time entries found"
                    pagination={{
                      currentPage,
                      totalPages,
                      onPageChange: setCurrentPage,
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
