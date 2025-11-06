/**
 * Time Entries List Page (Admin)
 *
 * Displays all time entries across users and projects with filters
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
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
  projectId: string;
  projectName?: string;
  createdAt: string;
}

export default function TimeEntriesPage() {
  const { getAuthHeaders } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');

  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, startDate, endDate]);

  const fetchTimeEntries = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        take: '20',
        ...(statusFilter !== 'all' && { isRunning: (statusFilter === 'running').toString() }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries?${params}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEntries(data.data.timeEntries || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchTerm === '' ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (entry.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesSearch;
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

  const handleToggleSelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const handleBulkExport = async () => {
    if (selectedEntries.size === 0) {
      alert('Please select at least one time entry to export');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries/export`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryIds: Array.from(selectedEntries),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-entries-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSelectedEntries(new Set());
      } else {
        alert('Failed to export time entries');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('An error occurred while exporting');
    }
  };

  const columns: TableColumn<TimeEntry>[] = [
    {
      key: 'select',
      header: 'Select',
      render: (entry) => (
        <input
          type="checkbox"
          checked={selectedEntries.has(entry.id)}
          onChange={() => handleToggleSelection(entry.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'userName',
      header: 'User',
      sortable: true,
      render: (entry) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
            {entry.userName?.charAt(0) || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-900">{entry.userName || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-900">{entry.projectName || 'No Project'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (entry) => (
        <p className="text-sm text-gray-900 truncate max-w-xs">{entry.description}</p>
      ),
    },
    {
      key: 'startTime',
      header: 'Start Time',
      sortable: true,
      render: (entry) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{formatDate(entry.startTime)}</p>
          <p className="text-xs text-gray-500">{new Date(entry.startTime).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'endTime',
      header: 'End Time',
      sortable: true,
      render: (entry) =>
        entry.endTime ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{formatDate(entry.endTime)}</p>
            <p className="text-xs text-gray-500">{new Date(entry.endTime).toLocaleTimeString()}</p>
          </div>
        ) : (
          <span className="text-sm text-gray-500 italic">Running</span>
        ),
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (entry) => (
        <span className="text-sm font-medium text-gray-900">{formatDuration(entry.duration)}</span>
      ),
    },
    {
      key: 'isRunning',
      header: 'Status',
      sortable: true,
      render: (entry) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            entry.isRunning
              ? 'bg-green-100 text-green-700 animate-pulse'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {entry.isRunning ? 'Running' : 'Stopped'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            View
          </Button>
        </div>
      ),
    },
  ];

  const totalHours = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  const runningEntries = entries.filter((e) => e.isRunning).length;
  const uniqueUsers = new Set(entries.map((e) => e.userId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-gray-600 mt-1">Monitor time tracking across all users and projects</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEntries.size > 0 && (
            <Button variant="secondary" onClick={handleBulkExport}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Selected ({selectedEntries.size})
            </Button>
          )}
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Time Entry
          </Button>
        </div>
      </div>

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
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
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
              <p className="text-sm text-gray-600">Running</p>
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </Card>

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
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueUsers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by description, user, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
            <div className="flex gap-2">
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
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <input
              type="checkbox"
              id="selectAll"
              checked={
                selectedEntries.size === filteredEntries.length && filteredEntries.length > 0
              }
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="selectAll" className="text-sm text-gray-700 cursor-pointer">
              Select all {filteredEntries.length} entries
            </label>
          </div>
        </div>
      </Card>

      {/* Time Entries Table */}
      <Table<TimeEntry>
        columns={columns}
        data={filteredEntries}
        keyExtractor={(entry) => entry.id}
        onRowClick={(entry) => router.push(`/admin/time-entries/${entry.id}`)}
        isLoading={isLoading}
        emptyMessage="No time entries found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
}
