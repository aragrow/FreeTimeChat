/**
 * New Time Entry Page
 *
 * Create new time entries
 * - Regular users: create entries for themselves
 * - Tenant admins: create entries for any user in their tenant
 * - System admins: create entries for any user (with tenant selection)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

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

interface Project {
  id: string;
  name: string;
  isBillableProject: boolean;
}

export default function NewTimeEntryPage() {
  const { getAuthHeaders, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Determine user role
  const isAdmin = user?.roles?.includes('admin');
  const isTenantAdmin = user?.roles?.includes('tenantadmin');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    projectId: '',
    description: '',
    startTime: '',
    endTime: '',
    isBillable: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch tenants (admin only)
  useEffect(() => {
    if (isAdmin) {
      fetchTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Fetch users and projects when tenant is selected
  useEffect(() => {
    if (isAdmin && !selectedTenant) {
      return;
    }
    fetchUsers();
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant, isAdmin, isTenantAdmin]);

  const fetchTenants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?limit=1000`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users || []);

        // Auto-select current user for regular users
        if (!isAdmin && !isTenantAdmin && user?.id) {
          setFormData((prev) => ({ ...prev, userId: user.id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?limit=1000`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (formData.endTime && formData.startTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if ((isAdmin || isTenantAdmin) && !formData.userId) {
      newErrors.userId = 'User is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Calculate duration if both start and end times are provided
      let duration = null;
      if (formData.startTime && formData.endTime) {
        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);
        duration = Math.floor((end.getTime() - start.getTime()) / 1000); // seconds
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formData.userId || user?.id,
          projectId: formData.projectId,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime || null,
          duration,
          isBillable: formData.isBillable,
        }),
      });

      if (response.ok) {
        showToast('success', 'Time entry created successfully');
        router.push('/time-entries');
      } else {
        const data = await response.json();
        showToast('error', data.message || 'Failed to create time entry');
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
      showToast('error', 'An error occurred while creating the time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default start time to current time
  useEffect(() => {
    if (!formData.startTime) {
      const now = new Date();
      // Format for datetime-local input
      const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormData((prev) => ({ ...prev, startTime: formatted }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProtectedRoute>
      <ImpersonationBanner />
      <div className="min-h-screen bg-gray-50 impersonation-offset">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <Button variant="secondary" onClick={() => router.push('/time-entries')}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Time Entries
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 mt-4">Add Time Entry</h1>
              <p className="text-gray-600 mt-1">Create a new time tracking entry</p>
            </div>

            {/* Tenant Selection (Admin Only) */}
            {isAdmin && (
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Select Tenant:
                  </label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select a Tenant --</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.tenantKey})
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            )}

            {/* Form */}
            {!isAdmin || selectedTenant ? (
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* User Selection (Admin and Tenant Admin only) */}
                  {(isAdmin || isTenantAdmin) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.userId ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">-- Select User --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
                          </option>
                        ))}
                      </select>
                      {errors.userId && (
                        <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
                      )}
                    </div>
                  )}

                  {/* Project Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.projectId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    {errors.projectId && (
                      <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="What did you work on?"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className={errors.startTime ? 'border-red-500' : ''}
                    />
                    {errors.startTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
                    )}
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time (optional - leave blank to start timer)
                    </label>
                    <Input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className={errors.endTime ? 'border-red-500' : ''}
                    />
                    {errors.endTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
                    )}
                  </div>

                  {/* Billable Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isBillable"
                      name="isBillable"
                      checked={formData.isBillable}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isBillable" className="ml-2 text-sm font-medium text-gray-700">
                      Billable
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Creating...' : 'Create Time Entry'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => router.push('/time-entries')}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-600">Please select a tenant to continue</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
