/**
 * Projects List Page (User)
 *
 * Read-only view of projects for regular users
 */

'use client';

import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface Project extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  client?: {
    id: string;
    name: string;
  };
  hourlyRate?: number;
  isBillable: boolean;
  allocatedHours?: number;
  isActive: boolean;
  createdAt: string;
  totalHours?: number;
  totalTimeEntries?: number;
}

export default function ProjectsPage() {
  const { fetchWithAuth, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non-billable'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (!authLoading) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, authLoading]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        take: '20',
        ...(statusFilter !== 'all' && { isActive: (statusFilter === 'active').toString() }),
      });

      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/projects?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();

      if (data.status === 'success') {
        setProjects(data.data || []);
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter projects by search term and billable status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchTerm === '' ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description &&
        project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (project.client?.name &&
        project.client.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBillable =
      billableFilter === 'all' ||
      (billableFilter === 'billable' && project.isBillable) ||
      (billableFilter === 'non-billable' && !project.isBillable);

    return matchesSearch && matchesBillable;
  });

  const buildColumns = (): TableColumn<Project>[] => [
    {
      key: 'client',
      header: 'Client',
      render: (project) => (
        <div>
          <div className="font-medium text-gray-900">{project.client?.name || 'No Client'}</div>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Project',
      render: (project) => (
        <div>
          <div className="font-medium text-gray-900">{project.name}</div>
          {project.description && (
            <div className="text-sm text-gray-500 truncate max-w-md">{project.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'totalHours',
      header: 'Your Hours',
      render: (project) => (
        <div className="text-gray-700">
          <div className="font-medium">{project.totalHours || 0}h</div>
          {project.totalTimeEntries !== undefined && (
            <div className="text-xs text-gray-500">
              {project.totalTimeEntries} {project.totalTimeEntries === 1 ? 'entry' : 'entries'}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'isBillable',
      header: 'Billable',
      render: (project) => (
        <div className="flex items-center gap-2">
          {project.isBillable ? (
            <Badge variant="success" size="sm">
              Billable
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              Non-Billable
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'hourlyRate',
      header: 'Hourly Rate',
      render: (project) => (
        <div className="text-gray-700">
          {project.isBillable && project.hourlyRate ? `$${project.hourlyRate.toFixed(2)}` : '-'}
        </div>
      ),
    },
    {
      key: 'allocatedHours',
      header: 'Allocated Hours',
      render: (project) => (
        <div className="text-gray-700">
          {project.allocatedHours ? `${project.allocatedHours}h` : 'Unlimited'}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (project) => (
        <Badge variant={project.isActive ? 'success' : 'error'} size="sm">
          {project.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <AppLayout title={t('nav.projects')}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.projects')}</h1>
          <p className="text-gray-600 mt-1">View your projects with time tracking</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="space-y-4">
            {/* Row 1: Search, Status, Billable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.search')}
                </label>
                <Input
                  type="text"
                  placeholder="Search projects, clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* Billable Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billability</label>
                <select
                  value={billableFilter}
                  onChange={(e) => setBillableFilter(e.target.value as typeof billableFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Billability</option>
                  <option value="billable">Billable Only</option>
                  <option value="non-billable">Non-Billable Only</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Projects Table */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-gray-500">Loading projects...</div>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <EmptyState
              icon="folder"
              title="No Projects Found"
              description={
                searchTerm || statusFilter !== 'all' || billableFilter !== 'all'
                  ? 'No projects match your filters. Try adjusting your search criteria.'
                  : 'No projects available.'
              }
            />
          </Card>
        ) : (
          <Card>
            <Table<Project>
              columns={buildColumns()}
              data={filteredProjects}
              keyExtractor={(project) => project.id}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
