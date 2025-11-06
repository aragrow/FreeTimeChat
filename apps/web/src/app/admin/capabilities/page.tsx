/**
 * Capabilities List Page
 *
 * Admin CRUD interface for managing system capabilities/permissions
 */

'use client';

import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';

interface Capability extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  roleCount?: number;
}

interface CreateCapabilityData {
  name: string;
  description: string;
}

export default function CapabilitiesPage() {
  const { getAuthHeaders } = useAuth();

  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateCapabilityData>({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCapabilities = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/capabilities`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setCapabilities(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCapability = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/capabilities`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateFormData({ name: '', description: '' });
        fetchCapabilities();
      } else {
        const errorData = await response.json();
        alert(`Failed to create capability: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Create capability error:', error);
      alert('An error occurred while creating the capability.');
    }
  };

  const filteredCapabilities = capabilities.filter((capability) => {
    const matchesSearch =
      searchTerm === '' ||
      capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (capability.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const columns: TableColumn<Capability>[] = [
    {
      key: 'name',
      header: 'Capability Name',
      sortable: true,
      render: (capability) => (
        <div>
          <p className="font-medium text-gray-900">{capability.name}</p>
          {capability.description && (
            <p className="text-sm text-gray-500 mt-1">{capability.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'roleCount',
      header: 'Roles',
      sortable: true,
      render: (capability) => (
        <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full">
          {capability.roleCount || 0} roles
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (capability) => new Date(capability.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capabilities</h1>
          <p className="text-gray-600 mt-1">Manage system permissions and capabilities</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Capability
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Capabilities</p>
              <p className="text-2xl font-bold text-gray-900">{capabilities.length}</p>
            </div>
          </div>
        </Card>

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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900">
                {capabilities.reduce((sum, cap) => sum + (cap.roleCount || 0), 0)}
              </p>
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">System-Wide</p>
              <p className="text-2xl font-bold text-gray-900">
                {capabilities.filter((c) => c.name.includes('system')).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <Input
          type="text"
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {/* Capabilities Table */}
      <Table<Capability>
        columns={columns}
        data={filteredCapabilities}
        keyExtractor={(capability) => capability.id}
        isLoading={isLoading}
        emptyMessage="No capabilities found"
      />

      {/* Create Capability Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Capability</h2>
            <form onSubmit={handleCreateCapability} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Capability Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="e.g., users.read, projects.create"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use dot notation for hierarchical permissions
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, description: e.target.value })
                  }
                  placeholder="Describe what this capability allows..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Capability
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({ name: '', description: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
