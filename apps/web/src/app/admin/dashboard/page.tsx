/**
 * Admin Dashboard
 *
 * Displays key metrics and statistics
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const { user, getAuthHeaders } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [accountRequestStats, setAccountRequestStats] = useState<any>(null);
  const isAdmin = user?.roles?.includes('admin');

  useEffect(() => {
    fetchTenants();
    fetchAccountRequestData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const fetchTenants = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTenants(data.data.tenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.append('tenantId', selectedTenantId);
      }

      // Fetch dashboard stats
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/stats?${params}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      } else {
        console.error('Failed to fetch stats:', await statsResponse.text());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountRequestData = async () => {
    try {
      // Fetch account request stats
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/account-requests/stats`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAccountRequestStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch account request data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  // Build stat cards in logical order: General to Specific
  // Admin view: Tenants → Users → Roles
  // TenantAdmin view: Users
  // When tenant is selected: Tenants → Clients → Projects → Users → Roles
  const statCards = [];
  const isTenantSelected = selectedTenantId && selectedTenantId !== 'all';

  // 1. Total Tenants (Admin only - Most general)
  if (isAdmin) {
    statCards.push({
      title: 'Total Tenants',
      value: stats.tenants?.total || 0,
      subtitle: `${stats.tenants?.active || 0} active`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
      color: 'bg-indigo-500',
    });
  }

  // 2. Total Clients (Organizations/Customers) - Show when tenant is selected
  if (isTenantSelected) {
    statCards.push({
      title: 'Total Clients',
      value: stats.clients?.total || 0,
      subtitle: `${stats.clients?.active || 0} active`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      color: 'bg-green-500',
    });
  }

  // 3. Total Projects - Show when tenant is selected
  if (isTenantSelected) {
    statCards.push({
      title: 'Total Projects',
      value: stats.projects?.total || 0,
      subtitle: `${stats.projects?.active || 0} active`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      color: 'bg-purple-500',
    });
  }

  // 4. Total Users (People)
  statCards.push({
    title: 'Total Users',
    value: stats.users?.total || 0,
    subtitle: `${stats.users?.active || 0} active`,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    color: 'bg-blue-500',
  });

  // 5. Total Roles (Admin only - System configuration)
  if (isAdmin) {
    statCards.push({
      title: 'Total Roles',
      value: stats.roles?.total || 0,
      subtitle: `${stats.roles?.custom || 0} custom`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      color: 'bg-yellow-500',
    });
  }

  // 6. Pending Account Requests (Admin only)
  if (isAdmin && accountRequestStats) {
    statCards.push({
      title: 'Pending Requests',
      value: accountRequestStats.pending || 0,
      subtitle: `${accountRequestStats.total || 0} total requests`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: 'bg-orange-500',
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {stats?.selectedTenant
              ? `Overview for ${stats.selectedTenant.name}`
              : 'Overview of your FreeTimeChat system'}
          </p>
        </div>

        {/* Tenant Filter - Only show for admin users */}
        {isAdmin && (
          <div className="w-64">
            <label htmlFor="tenant-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Tenant
            </label>
            <select
              id="tenant-filter"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                {stat.subtitle && <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>}
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active in last 30 days</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.users?.activeInLast30Days || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New in last 7 days</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.users?.newInLast7Days || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Inactive users</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.users?.inactive || 0}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Growth</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active clients</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.clients?.active || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New in last 7 days</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.clients?.newInLast7Days || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Inactive clients</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.clients?.inactive || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <a href="/admin/tenants" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Manage Tenants</h3>
                  <p className="text-xs text-gray-500 mt-1">Configure tenant organizations</p>
                </div>
              </div>
            </Card>
          </a>
        )}

        {isTenantSelected && !isAdmin && (
          <a href="/admin/clients" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Manage Clients</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage client accounts</p>
                </div>
              </div>
            </Card>
          </a>
        )}

        {isTenantSelected && !isAdmin && (
          <a href="/admin/projects" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Manage Projects</h3>
                  <p className="text-xs text-gray-500 mt-1">View and manage projects</p>
                </div>
              </div>
            </Card>
          </a>
        )}

        <a href="/admin/users" className="block">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Manage Users</h3>
                <p className="text-xs text-gray-500 mt-1">View and manage user accounts</p>
              </div>
            </div>
          </Card>
        </a>

        {isAdmin && (
          <a href="/admin/account-requests" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Account Requests</h3>
                  <p className="text-xs text-gray-500 mt-1">Review and manage access requests</p>
                </div>
              </div>
            </Card>
          </a>
        )}

        {isAdmin && (
          <a href="/admin/roles" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600"
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
                  <h3 className="text-sm font-medium text-gray-900">Manage Roles</h3>
                  <p className="text-xs text-gray-500 mt-1">Configure roles and permissions</p>
                </div>
              </div>
            </Card>
          </a>
        )}
      </div>
    </div>
  );
}
