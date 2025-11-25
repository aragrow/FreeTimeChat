/**
 * User Dashboard Page
 *
 * Main dashboard for users showing their time tracking KPIs and statistics
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

interface TimeEntry {
  id: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
    client?: {
      name: string;
    };
  };
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isBillable?: boolean;
}

interface DashboardStats {
  hoursToday: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
  hoursYTD: number;
  billableHoursThisWeek: number;
  nonBillableHoursThisWeek: number;
  projectCount: number;
  tasksCount: number;
  tasksPending: number;
  tasksCompleted: number;
  utilizationRate: number;
  projectBreakdown: {
    projectName: string;
    clientName?: string;
    hours: number;
  }[];
}

export default function DashboardPage() {
  const { fetchWithAuth, user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    hoursToday: 0,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    hoursYTD: 0,
    billableHoursThisWeek: 0,
    nonBillableHoursThisWeek: 0,
    projectCount: 0,
    tasksCount: 0,
    tasksPending: 0,
    tasksCompleted: 0,
    utilizationRate: 0,
    projectBreakdown: [],
  });
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      console.log('Fetching dashboard data for user:', user);

      // Fetch project count from API (separate from time entries)
      await fetchProjectCount();

      // Fetch tasks count
      await fetchTasksCount();

      // Fetch ALL time entries for accurate KPI calculations (with pagination)
      await fetchAllEntriesForKPIs();

      // Fetch recent 10 entries for the recent entries list
      await fetchRecentEntries();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectCount = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/projects?limit=1000`
      );

      if (response.ok) {
        const data = await response.json();
        const projects = data.data || [];
        // Filter active projects only (no deletedAt)
        const activeProjects = projects.filter((p: any) => !p.deletedAt);

        // Update stats with project count
        setStats((prev) => ({
          ...prev,
          projectCount: activeProjects.length,
        }));

        console.log(`Active projects count: ${activeProjects.length}`);
      }
    } catch (error) {
      console.error('Failed to fetch project count:', error);
    }
  };

  const fetchTasksCount = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/tasks?limit=1000`);

      if (response.ok) {
        const data = await response.json();
        const tasks = data.data || [];

        // Count tasks by status
        const pending = tasks.filter(
          (t: any) => !t.deletedAt && (t.status === 'TODO' || t.status === 'IN_PROGRESS')
        ).length;
        const completed = tasks.filter((t: any) => !t.deletedAt && t.status === 'DONE').length;

        // Update stats with task counts
        setStats((prev) => ({
          ...prev,
          tasksCount: tasks.filter((t: any) => !t.deletedAt).length,
          tasksPending: pending,
          tasksCompleted: completed,
        }));

        console.log(`Tasks: ${tasks.length} total, ${pending} pending, ${completed} completed`);
      }
    } catch (error) {
      console.error('Failed to fetch tasks count:', error);
    }
  };

  const fetchAllEntriesForKPIs = async () => {
    try {
      let allEntries: TimeEntry[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      // Fetch all pages
      while (hasMore) {
        const response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/time-entries?limit=${limit}&page=${page}`
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Unauthorized - redirecting to login');
            router.push('/login');
          }
          break;
        }

        const data = await response.json();
        const entries: TimeEntry[] = data.data || [];
        allEntries = allEntries.concat(entries);

        // Check if there are more pages
        const meta = data.meta;
        hasMore = meta && meta.page < meta.totalPages;
        page++;

        console.log(`Fetched page ${page - 1}, total entries so far: ${allEntries.length}`);
      }

      console.log(`Total time entries fetched for KPIs: ${allEntries.length}`);

      // Debug: Log details of each entry
      allEntries.forEach((entry, i) => {
        console.log(`Entry ${i + 1}:`, {
          project: entry.project?.name,
          startTime: entry.startTime,
          duration: entry.duration,
          hours: (entry.duration || 0) / 3600,
          isBillable: entry.isBillable,
        });
      });

      calculateStats(allEntries);

      // Find active entry (no end time)
      const active = allEntries.find((e) => !e.endTime);
      setActiveEntry(active || null);
    } catch (error) {
      console.error('Failed to fetch entries for KPIs:', error);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/time-entries?limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        const entries: TimeEntry[] = data.data || [];
        setRecentEntries(entries);
        console.log(`Recent entries fetched: ${entries.length}`);
      }
    } catch (error) {
      console.error('Failed to fetch recent entries:', error);
    }
  };

  const calculateStats = (entries: TimeEntry[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let hoursToday = 0;
    let hoursThisWeek = 0;
    let hoursThisMonth = 0;
    let hoursYTD = 0;
    let billableHoursThisWeek = 0;
    let nonBillableHoursThisWeek = 0;

    const projectHours: Record<string, { name: string; client?: string; hours: number }> = {};

    entries.forEach((entry) => {
      const duration = entry.duration || 0;
      const hours = duration / 3600; // Convert seconds to hours
      const entryDate = new Date(entry.startTime);

      // Today's hours
      if (entryDate >= today) {
        hoursToday += hours;
      }

      // This week's hours
      if (entryDate >= weekStart) {
        hoursThisWeek += hours;

        if (entry.isBillable) {
          billableHoursThisWeek += hours;
        } else {
          nonBillableHoursThisWeek += hours;
        }
      }

      // This month's hours
      if (entryDate >= monthStart) {
        hoursThisMonth += hours;
      }

      // Year to date hours
      if (entryDate >= yearStart) {
        hoursYTD += hours;
      }

      // Project breakdown (this week)
      if (entryDate >= weekStart && entry.project) {
        const projectKey = entry.project.id;
        if (!projectHours[projectKey]) {
          projectHours[projectKey] = {
            name: entry.project.name,
            client: entry.project.client?.name,
            hours: 0,
          };
        }
        projectHours[projectKey].hours += hours;
      }
    });

    const projectBreakdown = Object.values(projectHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Calculate utilization rate (hours worked this week vs 40-hour work week)
    const expectedHoursPerWeek = 40;
    const utilizationRate =
      hoursThisWeek > 0 ? Math.round((hoursThisWeek / expectedHoursPerWeek) * 100) : 0;

    // Update stats (project count and tasks are fetched separately)
    setStats((prev) => ({
      ...prev,
      hoursToday: Math.round(hoursToday * 10) / 10,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
      hoursYTD: Math.round(hoursYTD * 10) / 10,
      billableHoursThisWeek: Math.round(billableHoursThisWeek * 10) / 10,
      nonBillableHoursThisWeek: Math.round(nonBillableHoursThisWeek * 10) / 10,
      utilizationRate,
      projectBreakdown: projectBreakdown.map((p) => ({
        projectName: p.name,
        clientName: p.client,
        hours: Math.round(p.hours * 10) / 10,
      })),
    }));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back,{' '}
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.email || 'User'}
              !
            </p>
          </div>

          {/* Active Timer Alert */}
          {activeEntry && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-blue-900">Timer Running</p>
                    <p className="text-sm text-blue-700">
                      {activeEntry.project?.name || 'Unknown Project'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => router.push('/time-entries')}>View Timer</Button>
              </div>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Today */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Today</p>
                <p className="text-4xl font-bold">{stats.hoursToday}h</p>
                <p className="text-blue-100 text-sm">Hours logged</p>
              </div>
            </Card>

            {/* This Week */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="space-y-2">
                <p className="text-green-100 text-sm font-medium">This Week</p>
                <p className="text-4xl font-bold">{stats.hoursThisWeek}h</p>
                <p className="text-green-100 text-sm">{stats.billableHoursThisWeek}h billable</p>
              </div>
            </Card>

            {/* This Month */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">This Month</p>
                <p className="text-4xl font-bold">{stats.hoursThisMonth}h</p>
                <p className="text-purple-100 text-sm">Total hours</p>
              </div>
            </Card>

            {/* Year To Date */}
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <div className="space-y-2">
                <p className="text-indigo-100 text-sm font-medium">Year To Date</p>
                <p className="text-4xl font-bold">{stats.hoursYTD}h</p>
                <p className="text-indigo-100 text-sm">Total hours</p>
              </div>
            </Card>

            {/* Billable Ratio */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="space-y-2">
                <p className="text-orange-100 text-sm font-medium">Billable Ratio</p>
                <p className="text-4xl font-bold">
                  {stats.hoursThisWeek > 0
                    ? Math.round((stats.billableHoursThisWeek / stats.hoursThisWeek) * 100)
                    : 0}
                  %
                </p>
                <p className="text-orange-100 text-sm">This week</p>
              </div>
            </Card>

            {/* Projects Count */}
            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
              <div className="space-y-2">
                <p className="text-pink-100 text-sm font-medium">Projects</p>
                <p className="text-4xl font-bold">{stats.projectCount}</p>
                <p className="text-pink-100 text-sm">Active projects</p>
              </div>
            </Card>

            {/* Non-Billable Hours */}
            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <div className="space-y-2">
                <p className="text-cyan-100 text-sm font-medium">Non-Billable</p>
                <p className="text-4xl font-bold">{stats.nonBillableHoursThisWeek}h</p>
                <p className="text-cyan-100 text-sm">This week</p>
              </div>
            </Card>

            {/* Tasks */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <div className="space-y-2">
                <p className="text-amber-100 text-sm font-medium">Tasks</p>
                <p className="text-4xl font-bold">{stats.tasksCount}</p>
                <p className="text-amber-100 text-sm">
                  {stats.tasksPending} pending, {stats.tasksCompleted} done
                </p>
              </div>
            </Card>

            {/* Utilization Rate */}
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="space-y-2">
                <p className="text-emerald-100 text-sm font-medium">Utilization</p>
                <p className="text-4xl font-bold">{stats.utilizationRate}%</p>
                <p className="text-emerald-100 text-sm">vs 40h/week</p>
              </div>
            </Card>
          </div>

          {/* Project Breakdown */}
          {stats.projectBreakdown.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Projects This Week</h2>
              <div className="space-y-3">
                {stats.projectBreakdown.map((project, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{project.projectName}</p>
                      {project.clientName && (
                        <p className="text-sm text-gray-500">{project.clientName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{project.hours}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Time Entries */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Time Entries</h2>
              <Button variant="secondary" onClick={() => router.push('/time-entries')}>
                View All
              </Button>
            </div>

            {recentEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No time entries yet</p>
                <Button className="mt-4" onClick={() => router.push('/time-entries/new')}>
                  Create First Entry
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 rounded px-2 cursor-pointer"
                    onClick={() => router.push(`/time-entries/${entry.id}`)}
                  >
                    <div className="flex-1">
                      {entry.project?.client && (
                        <p className="text-sm text-gray-500 mb-1">{entry.project.client.name}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {entry.project?.name || 'Unknown Project'}
                        </p>
                        {entry.isBillable ? (
                          <Badge variant="success">Billable</Badge>
                        ) : (
                          <Badge variant="default">Non-Billable</Badge>
                        )}
                        {!entry.endTime && <Badge variant="primary">Running</Badge>}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(entry.startTime)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">
                        {formatDuration(entry.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="w-full" onClick={() => router.push('/time-entries/new')}>
                Add Time Entry
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/time-entries')}
              >
                View Time Clock
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/projects')}
              >
                My Projects
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
