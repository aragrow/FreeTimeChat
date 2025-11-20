/**
 * Admin Dashboard
 *
 * Customizable dashboard with KPI cards that users can add, remove, and reorder
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface KpiDefinition {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  valueKey: string;
  subtitleKey?: string;
  subtitleLabel?: string;
  format?: string;
}

interface DashboardConfig {
  kpis: string[];
  updatedAt?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function AdminDashboard() {
  const { user, getAuthHeaders } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [_accountRequestStats, setAccountRequestStats] = useState<{
    pending: number;
    total: number;
  } | null>(null);

  // Dashboard customization
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({ kpis: [] });
  const [availableKpis, setAvailableKpis] = useState<Record<string, KpiDefinition>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isAdmin = user?.roles?.includes('admin');
  const isTenantAdmin = user?.roles?.includes('tenantadmin');

  useEffect(() => {
    fetchDashboardConfig();
    if (isAdmin) {
      fetchTenants();
    }
    fetchAccountRequestData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const fetchDashboardConfig = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard-config`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardConfig(data.data.config);
        setAvailableKpis(data.data.availableKpis);
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard config:', error);
    }
  };

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

      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.append('tenantId', selectedTenantId);
      }

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
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountRequestData = async () => {
    try {
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

  const saveDashboardConfig = async (newKpis: string[]) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard-config`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kpis: newKpis }),
      });

      if (response.ok) {
        setDashboardConfig({ ...dashboardConfig, kpis: newKpis });
      }
    } catch (error) {
      console.error('Failed to save dashboard config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetDashboardConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard-config/reset`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardConfig(data.data.config);
      }
    } catch (error) {
      console.error('Failed to reset dashboard config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const removeKpi = (kpiId: string) => {
    const newKpis = dashboardConfig.kpis.filter((k) => k !== kpiId);
    saveDashboardConfig(newKpis);
  };

  const addKpi = (kpiId: string) => {
    if (!dashboardConfig.kpis.includes(kpiId)) {
      const newKpis = [...dashboardConfig.kpis, kpiId];
      saveDashboardConfig(newKpis);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newKpis = [...dashboardConfig.kpis];
    const [draggedItem] = newKpis.splice(draggedIndex, 1);
    newKpis.splice(index, 0, draggedItem);

    setDashboardConfig({ ...dashboardConfig, kpis: newKpis });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      saveDashboardConfig(dashboardConfig.kpis);
    }
    setDraggedIndex(null);
  };

  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  const formatValue = (value: unknown, format?: string): string => {
    if (value === null || value === undefined) return '0';
    const num = Number(value);
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    }
    if (format === 'hours') {
      return `${num}h`;
    }
    return num.toLocaleString();
  };

  const getKpiIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      users: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      'user-check': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      building: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      folder: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      clock: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      calendar: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      'dollar-sign': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      'check-square': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      loader: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      'alert-triangle': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      'trending-up': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      'credit-card': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      'file-text': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      send: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      ),
      'alert-circle': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      'minus-circle': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      percent: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      tag: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
    };
    return icons[iconName] || icons['file-text'];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">{t('dashboard.failedToLoad')}</p>
        </div>
      </div>
    );
  }

  const unusedKpis = Object.keys(availableKpis).filter(
    (kpiId) => !dashboardConfig.kpis.includes(kpiId)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">
            {(stats as Record<string, Record<string, string>>)?.selectedTenant?.name
              ? t('dashboard.overviewFor', {
                  name: (stats as Record<string, Record<string, string>>).selectedTenant.name,
                })
              : t('dashboard.overviewSystem')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tenant Filter - Only show for admin users */}
          {isAdmin && (
            <div className="w-48">
              <select
                id="tenant-filter"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">{t('dashboard.allTenants')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Edit Mode Toggle */}
          <Button
            variant={isEditMode ? 'primary' : 'outline'}
            onClick={() => setIsEditMode(!isEditMode)}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {isEditMode ? t('common.done') : t('dashboard.customize')}
          </Button>
        </div>
      </div>

      {/* Edit Mode Controls */}
      {isEditMode && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {t('dashboard.customizationMode')}
              </p>
              <p className="text-xs text-blue-700">{t('dashboard.customizationHint')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                {t('dashboard.addKpi')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDashboardConfig}
                disabled={isSaving}
              >
                {t('dashboard.resetToDefaults')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardConfig.kpis.map((kpiId, index) => {
          const kpi = availableKpis[kpiId];
          if (!kpi) return null;

          const value = getNestedValue(stats as Record<string, unknown>, kpi.valueKey);
          const subtitle = kpi.subtitleKey
            ? getNestedValue(stats as Record<string, unknown>, kpi.subtitleKey)
            : null;

          return (
            <div
              key={kpiId}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${isEditMode ? 'cursor-move' : ''} ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <Card className={`p-6 ${isEditMode ? 'ring-2 ring-blue-200' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      {(() => {
                        const key = `dashboard.kpis.${kpiId}.title`;
                        const translated = t(key);
                        return translated === key ? kpi.title : translated;
                      })()}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatValue(value, kpi.format)}
                    </p>
                    {subtitle !== null && kpi.subtitleLabel && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatValue(subtitle, kpi.format)}{' '}
                        {(() => {
                          const key = `dashboard.kpis.${kpiId}.subtitle`;
                          const translated = t(key);
                          return translated === key ? kpi.subtitleLabel : translated;
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`${kpi.color} p-3 rounded-lg text-white`}>
                      {getKpiIcon(kpi.icon)}
                    </div>
                    {isEditMode && (
                      <button
                        onClick={() => removeKpi(kpiId)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title={t('dashboard.removeKpi')}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}

        {/* Empty state when no KPIs */}
        {dashboardConfig.kpis.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">{t('dashboard.noKpisConfigured')}</p>
            <Button onClick={() => setShowAddModal(true)}>{t('dashboard.addKpis')}</Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!isEditMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(isAdmin || isTenantAdmin) && (
            <a href="/admin/clients" className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    {getKpiIcon('building')}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {t('dashboard.quickActions.manageClients')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('dashboard.quickActions.manageClientsDesc')}
                    </p>
                  </div>
                </div>
              </Card>
            </a>
          )}

          <a href="/admin/invoices" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getKpiIcon('file-text')}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {t('dashboard.quickActions.invoices')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('dashboard.quickActions.invoicesDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </a>

          <a href="/time-entries" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  {getKpiIcon('clock')}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {t('dashboard.quickActions.timeEntries')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('dashboard.quickActions.timeEntriesDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </a>

          <a href="/admin/expenses" className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  {getKpiIcon('minus-circle')}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {t('dashboard.quickActions.expenses')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('dashboard.quickActions.expensesDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </a>
        </div>
      )}

      {/* Add KPI Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.addKpi')}</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {unusedKpis.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('dashboard.allKpisAdded')}</p>
              ) : (
                <div className="space-y-6">
                  {categories.map((category) => {
                    const categoryKpis = unusedKpis.filter(
                      (kpiId) => availableKpis[kpiId]?.category === category.id
                    );
                    if (categoryKpis.length === 0) return null;

                    return (
                      <div key={category.id}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                          {category.name}
                          <span className="font-normal text-gray-500 ml-2">
                            {category.description}
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categoryKpis.map((kpiId) => {
                            const kpi = availableKpis[kpiId];
                            return (
                              <button
                                key={kpiId}
                                onClick={() => {
                                  addKpi(kpiId);
                                  setShowAddModal(false);
                                }}
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-left transition-colors"
                              >
                                <div className={`${kpi.color} p-2 rounded-lg text-white`}>
                                  {getKpiIcon(kpi.icon)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{kpi.title}</p>
                                  <p className="text-xs text-gray-500">{kpi.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="w-full">
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
