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
import { AppLayout } from '@/components/layout/AppLayout';
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

  // Get user's tracking mode (default to CLOCK if not set)
  const userTrackingMode = user?.trackingMode || 'CLOCK';
  const canUseManual = userTrackingMode === 'TIME';

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
    date: '', // Just date, not datetime
    hours: 1, // Hours worked (0-24, in 0.5 increments)
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
    // Don't fetch if user is not loaded yet
    if (!user) {
      console.log('Skipping fetch - user not loaded yet');
      return;
    }

    if (isAdmin && !selectedTenant) {
      return;
    }

    // Only fetch users list if admin/tenantadmin (regular users can only create entries for themselves)
    if (isAdmin || isTenantAdmin) {
      fetchUsers();
    }

    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant, isAdmin, isTenantAdmin, user]);

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
      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/projects?take=1000`
          : `${process.env.NEXT_PUBLIC_API_URL}/projects?limit=1000`;

      console.log('Fetching projects:', {
        isAdmin,
        isTenantAdmin,
        endpoint,
        userRoles: user?.roles,
      });

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('Projects response:', {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Projects data:', data);
        // Handle different response structures
        const projectsList = isAdmin || isTenantAdmin ? data.data.projects || [] : data.data || [];
        console.log('Setting projects:', projectsList);
        setProjects(projectsList);
      } else {
        const errorData = await response.json();
        console.error('Projects fetch error:', errorData);
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

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (formData.hours <= 0 || formData.hours > 24) {
      newErrors.hours = 'Hours must be between 0 and 24';
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

      // Create start and end times from date and hours
      // Start time: beginning of the selected date (8:00 AM)
      const startTime = new Date(`${formData.date}T08:00:00`);

      // End time: start time + hours worked
      const endTime = new Date(startTime.getTime() + formData.hours * 60 * 60 * 1000);

      // Duration in seconds
      const duration = Math.floor(formData.hours * 60 * 60);

      // Use different endpoint based on user role
      const endpoint =
        isAdmin || isTenantAdmin
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/time-entries`
          : `${process.env.NEXT_PUBLIC_API_URL}/time-entries`;

      console.log('Creating time entry:', {
        isAdmin,
        isTenantAdmin,
        endpoint,
        userRoles: user?.roles,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formData.userId || user?.id,
          projectId: formData.projectId,
          description: formData.description,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          isBillable: formData.isBillable,
        }),
      });

      console.log('Time entry response:', {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        showToast('success', 'Time entry created successfully');
        router.push('/time-entries');
      } else {
        const data = await response.json();
        console.error('Time entry creation error:', data);
        showToast('error', data.message || 'Failed to create time entry');
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
      showToast('error', 'An error occurred while creating the time entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default date to today
  useEffect(() => {
    if (!formData.date) {
      const now = new Date();
      // Format for date input (YYYY-MM-DD)
      const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      setFormData((prev) => ({ ...prev, date: formatted }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if user can use manual entry (redirect if CLOCK only)
  useEffect(() => {
    if (user && !isAdmin && !isTenantAdmin && !canUseManual) {
      showToast('error', 'Your account is set to Clock mode only. Please use the time clock.');
      router.push('/time-entries');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canUseManual]);

  return (
    <AppLayout title="Add Time Entry" showHeader={false}>
      <div className="min-h-screen bg-gray-50">
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

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className={errors.date ? 'border-red-500' : ''}
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                  </div>

                  {/* Hours with Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours Worked <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {/* Manual Input */}
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          name="hours"
                          value={formData.hours}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0 && value <= 24) {
                              setFormData((prev) => ({ ...prev, hours: value }));
                            }
                          }}
                          step="0.5"
                          min="0"
                          max="24"
                          className={`w-24 ${errors.hours ? 'border-red-500' : ''}`}
                        />
                        <span className="text-sm text-gray-600">hours</span>
                      </div>

                      {/* Slider */}
                      <div className="px-1">
                        <input
                          type="range"
                          min="0"
                          max="24"
                          step="0.5"
                          value={formData.hours}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormData((prev) => ({ ...prev, hours: value }));
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0h</span>
                          <span>6h</span>
                          <span>12h</span>
                          <span>18h</span>
                          <span>24h</span>
                        </div>
                      </div>
                    </div>
                    {errors.hours && <p className="mt-1 text-sm text-red-600">{errors.hours}</p>}
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
    </AppLayout>
  );
}
