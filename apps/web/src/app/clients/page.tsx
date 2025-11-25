/**
 * Clients List Page (User)
 *
 * Read-only view of clients for regular users
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

interface Client extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ClientsPage() {
  const { getAuthHeaders } = useAuth();
  const { t } = useTranslation();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      // Add search if present
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/clients?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();

      if (data.status === 'success') {
        setClients(data.data || []);
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clients by status
  const filteredClients = clients.filter((client) => {
    if (statusFilter === 'active') return client.isActive;
    if (statusFilter === 'inactive') return !client.isActive;
    return true;
  });

  const buildColumns = (): TableColumn<Client>[] => [
    {
      header: 'Client Name',
      accessor: 'name',
      cell: (client) => (
        <div>
          <div className="font-medium text-gray-900">{client.name}</div>
          <div className="text-sm text-gray-500">{client.slug}</div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: 'email',
      cell: (client) => (
        <div>
          {client.email && <div className="text-gray-700">{client.email}</div>}
          {client.phone && <div className="text-sm text-gray-500">{client.phone}</div>}
        </div>
      ),
    },
    {
      header: 'Website',
      accessor: 'website',
      cell: (client) =>
        client.website ? (
          <a
            href={client.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {client.website}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      cell: (client) => (
        <Badge variant={client.isActive ? 'success' : 'error'} size="sm">
          {client.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  // Trigger search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      fetchClients();
    }
  };

  return (
    <AppLayout title={t('nav.clients')}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.clients')}</h1>
          <p className="text-gray-600 mt-1">View all clients and their contact information</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.search')}
              </label>
              <Input
                type="text"
                placeholder="Search clients by name, email, or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Clients Table */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-gray-500">Loading clients...</div>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card>
            <EmptyState
              icon="users"
              title="No Clients Found"
              description={
                searchTerm || statusFilter !== 'all'
                  ? 'No clients match your filters. Try adjusting your search criteria.'
                  : 'No clients available.'
              }
            />
          </Card>
        ) : (
          <Card>
            <Table<Client>
              columns={buildColumns()}
              data={filteredClients}
              keyExtractor={(client) => client.id}
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
