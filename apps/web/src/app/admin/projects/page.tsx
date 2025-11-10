/**
 * Projects List Page (Admin)
 *
 * Displays all projects across clients with filters and statistics
 */

'use client';

import { useEffect, useState } from 'react';
import type { TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';

interface Project extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  clientName?: string;
  hourlyRate?: number;
  isBillable: boolean;
  allocatedHours?: number;
  additionalHoursAllocated?: number;
  isActive: boolean;
  createdAt: string;
  totalHours?: number;
  teamMemberCount?: number;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
}

export default function ProjectsPage() {
  const { getAuthHeaders } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    hourlyRate: '',
    isBillable: true,
    isFixedHours: false,
    allocatedHours: '',
    userIds: [] as string[],
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        take: '20',
        ...(statusFilter !== 'all' && { isActive: (statusFilter === 'active').toString() }),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data.projects || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
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
        setClients(
          (result.data.clients || []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?limit=1000`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(
          (result.data.users || []).map((u: { id: string; name: string; email: string }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/project/${projectId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const members = result.data || [];
        setProjectMembers(members);
        // Update form data with user IDs
        setFormData((prev) => ({
          ...prev,
          userIds: members.map((m: ProjectMember) => m.userId),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch project members:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Project name is required');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          clientId: formData.clientId || undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          isBillable: formData.isBillable,
          allocatedHours: formData.allocatedHours ? parseFloat(formData.allocatedHours) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProjectId = data.data.id;

        // Add users to the project if any selected
        if (formData.userIds.length > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/bulk`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId: newProjectId,
              userIds: formData.userIds,
            }),
          });
        }

        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          clientId: '',
          hourlyRate: '',
          isBillable: true,
          isFixedHours: false,
          allocatedHours: '',
          userIds: [],
        });
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(`Failed to create project: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleUpdate = async () => {
    if (!editingProject) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/projects/${editingProject.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || undefined,
            clientId: formData.clientId || undefined,
            hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
            isBillable: formData.isBillable,
            allocatedHours: formData.allocatedHours
              ? parseFloat(formData.allocatedHours)
              : undefined,
          }),
        }
      );

      if (response.ok) {
        // Update user assignments
        const originalUserIds = projectMembers.map((m) => m.userId);
        const newUserIds = formData.userIds;

        // Find users to remove (in original but not in new)
        const usersToRemove = projectMembers.filter((m) => !newUserIds.includes(m.userId));

        // Find users to add (in new but not in original)
        const userIdsToAdd = newUserIds.filter((id) => !originalUserIds.includes(id));

        // Remove users
        for (const member of usersToRemove) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/${member.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
        }

        // Add users
        if (userIdsToAdd.length > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/project-members/bulk`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId: editingProject.id,
              userIds: userIdsToAdd,
            }),
          });
        }

        setEditingProject(null);
        setFormData({
          name: '',
          description: '',
          clientId: '',
          hourlyRate: '',
          isBillable: true,
          isFixedHours: false,
          allocatedHours: '',
          userIds: [],
        });
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(`Failed to update project: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const handleToggleActive = async (projectId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/projects/${projectId}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (response.ok) {
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle project status: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error toggling project status:', error);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (
      !confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/projects/${projectId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        fetchProjects();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete project: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      clientId: project.clientId || '',
      hourlyRate: project.hourlyRate ? project.hourlyRate.toString() : '',
      isBillable: project.isBillable,
      isFixedHours: !!project.allocatedHours,
      allocatedHours: project.allocatedHours ? project.allocatedHours.toString() : '',
      userIds: [], // Will be set by fetchProjectMembers
    });
    // Fetch project members
    fetchProjectMembers(project.id);
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchTerm === '' ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesSearch;
  });

  const columns: TableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      sortable: true,
      render: (project) => (
        <div>
          <p className="font-medium text-gray-900">{project.name}</p>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{project.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
      render: (project) => (
        <span className="text-sm text-gray-900">{project.clientName || 'N/A'}</span>
      ),
    },
    {
      key: 'teamMemberCount',
      header: 'Team',
      sortable: true,
      render: (project) => (
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
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
          <span className="text-sm text-gray-900">{project.teamMemberCount || 0}</span>
        </div>
      ),
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      sortable: true,
      render: (project) => {
        const totalHours = project.totalHours || 0;
        const allocatedHours = project.allocatedHours || 0;
        const additionalHours = project.additionalHoursAllocated || 0;
        const totalBudget = allocatedHours + additionalHours;
        const hasAllocation = allocatedHours > 0;
        const isOverBudget = hasAllocation && totalHours > totalBudget;
        const isNearBudget = hasAllocation && totalHours / totalBudget > 0.9 && !isOverBudget;

        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900">
              {totalHours.toFixed(1)}h
              {hasAllocation && <span className="text-xs text-gray-500"> / {totalBudget}h</span>}
            </span>
            {hasAllocation && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isOverBudget
                    ? 'bg-red-100 text-red-700'
                    : isNearBudget
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {isOverBudget
                  ? `Over by ${(totalHours - totalBudget).toFixed(1)}h`
                  : `${(totalBudget - totalHours).toFixed(1)}h left`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (project) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            project.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {project.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (project) => new Date(project.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (project) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(project);
            }}
            className="text-blue-600 hover:text-blue-900 text-sm"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(project.id, project.isActive);
            }}
            className="text-yellow-600 hover:text-yellow-900 text-sm"
          >
            {project.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(project.id, project.name);
            }}
            className="text-red-600 hover:text-red-900 text-sm"
            disabled={project.isActive}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const totalHours = projects.reduce((sum, project) => sum + (project.totalHours || 0), 0);
  const activeProjects = projects.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage projects across all clients</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Project
        </Button>
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects.reduce((sum, p) => sum + (p.teamMemberCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name, description, or client..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Projects Table */}
      <Table<Project>
        columns={columns}
        data={filteredProjects}
        keyExtractor={(project) => project.id}
        onRowClick={(project) => openEditModal(project)}
        isLoading={isLoading}
        emptyMessage="No projects found"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Create New Project</h2>

            {/* Project Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Project Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client (Optional)
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No client (Internal)</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Billing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isBillable}
                      onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Billable Project</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Check if this project should be billed to the client
                  </p>
                </div>
                {formData.isBillable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Budget Tracking */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Budget Tracking</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isFixedHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isFixedHours: e.target.checked,
                          allocatedHours: e.target.checked ? formData.allocatedHours : '',
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Fixed-hours project</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Set a fixed number of allocated hours for this project
                  </p>
                </div>
                {formData.isFixedHours && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allocated Hours
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.allocatedHours}
                      onChange={(e) => setFormData({ ...formData, allocatedHours: e.target.value })}
                      placeholder="0.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Original contracted hours (can add more later if scope changes)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Team Members</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.length > 0 ? (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.userIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              userIds: [...formData.userIds, user.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              userIds: formData.userIds.filter((id) => id !== user.id),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No users available</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    name: '',
                    description: '',
                    clientId: '',
                    hourlyRate: '',
                    isBillable: true,
                    isFixedHours: false,
                    allocatedHours: '',
                    userIds: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Edit Project</h2>

            {/* Project Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Project Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client (Optional)
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No client (Internal)</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Billing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isBillable}
                      onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Billable Project</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Check if this project should be billed to the client
                  </p>
                </div>
                {formData.isBillable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Budget Tracking */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Budget Tracking</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isFixedHours}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isFixedHours: e.target.checked,
                            allocatedHours: e.target.checked ? formData.allocatedHours : '',
                          })
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Fixed-hours project</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Set a fixed number of allocated hours for this project
                    </p>
                  </div>
                  {formData.isFixedHours && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allocated Hours
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.allocatedHours}
                        onChange={(e) =>
                          setFormData({ ...formData, allocatedHours: e.target.value })
                        }
                        placeholder="0.0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original contracted hours (can add more later if scope changes)
                      </p>
                    </div>
                  )}
                </div>

                {/* Budget Progress Display */}
                {editingProject.allocatedHours && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Original Budget</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {editingProject.allocatedHours}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Additional Hours</p>
                        <p className="text-lg font-semibold text-blue-600">
                          +{editingProject.additionalHoursAllocated || 0}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Budget</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {(editingProject.allocatedHours || 0) +
                            (editingProject.additionalHoursAllocated || 0)}
                          h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Hours Used</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {editingProject.totalHours?.toFixed(1) || '0.0'}h
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Budget Progress</span>
                        <span>
                          {(
                            ((editingProject.totalHours || 0) /
                              ((editingProject.allocatedHours || 0) +
                                (editingProject.additionalHoursAllocated || 0))) *
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (editingProject.totalHours || 0) >
                            (editingProject.allocatedHours || 0) +
                              (editingProject.additionalHoursAllocated || 0)
                              ? 'bg-red-500'
                              : (editingProject.totalHours || 0) /
                                    ((editingProject.allocatedHours || 0) +
                                      (editingProject.additionalHoursAllocated || 0)) >
                                  0.9
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              ((editingProject.totalHours || 0) /
                                ((editingProject.allocatedHours || 0) +
                                  (editingProject.additionalHoursAllocated || 0))) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-medium ${
                            (editingProject.totalHours || 0) >
                            (editingProject.allocatedHours || 0) +
                              (editingProject.additionalHoursAllocated || 0)
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {(editingProject.totalHours || 0) >
                          (editingProject.allocatedHours || 0) +
                            (editingProject.additionalHoursAllocated || 0)
                            ? `Over budget by ${(
                                (editingProject.totalHours || 0) -
                                ((editingProject.allocatedHours || 0) +
                                  (editingProject.additionalHoursAllocated || 0))
                              ).toFixed(1)}h`
                            : `${(
                                (editingProject.allocatedHours || 0) +
                                (editingProject.additionalHoursAllocated || 0) -
                                (editingProject.totalHours || 0)
                              ).toFixed(1)}h remaining`}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const additionalHours = prompt(
                              'How many additional hours do you want to add to the budget?',
                              '10'
                            );
                            if (additionalHours && parseFloat(additionalHours) > 0) {
                              // TODO: Add API call to update additionalHoursAllocated
                              alert('Feature coming soon: Add hours via API');
                            }
                          }}
                        >
                          Add Hours
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Team Members</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.length > 0 ? (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.userIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              userIds: [...formData.userIds, user.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              userIds: formData.userIds.filter((id) => id !== user.id),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No users available</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProject(null);
                  setFormData({
                    name: '',
                    description: '',
                    clientId: '',
                    hourlyRate: '',
                    isBillable: true,
                    isFixedHours: false,
                    allocatedHours: '',
                    userIds: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
