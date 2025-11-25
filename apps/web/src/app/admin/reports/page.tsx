/**
 * Reports Page
 *
 * Analytics and reporting dashboard with charts and export functionality
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface TimeByUserData {
  userId: string;
  userName: string;
  userEmail: string;
  totalHours: number;
  entryCount: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
}

interface TimeByProjectData {
  projectId: string;
  projectName: string;
  totalHours: number;
  entryCount: number;
  userBreakdown: Array<{
    userId: string;
    userName: string;
    hours: number;
  }>;
}

interface TimeByDateData {
  date: string;
  totalHours: number;
  entryCount: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
}

interface SummaryStats {
  totalHours: number;
  entryCount: number;
  averagePerEntry: number;
  averagePerDay: number;
  userCount: number;
  projectCount: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function ReportsPage() {
  const { fetchWithAuth } = useAuth();
  const [reportType, setReportType] = useState<'user' | 'project' | 'date'>('user');

  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [timeByUserData, setTimeByUserData] = useState<TimeByUserData[]>([]);

  const [timeByProjectData, setTimeByProjectData] = useState<TimeByProjectData[]>([]);

  const [timeByDateData, setTimeByDateData] = useState<TimeByDateData[]>([]);

  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  useEffect(() => {
    // Set default date range to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      // Fetch summary stats
      const summaryResponse = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/reports/summary?${params}`);

      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        setSummaryStats(data.data);
      }

      // Fetch specific report data based on type
      let endpoint = '';
      switch (reportType) {
        case 'user':
          endpoint = 'time-by-user';
          break;
        case 'project':
          endpoint = 'time-by-project';
          break;
        case 'date':
          endpoint = 'time-by-date';
          break;
      }

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/reports/${endpoint}?${params}`);

      if (response.ok) {
        const data = await response.json();
        switch (reportType) {
          case 'user':
            setTimeByUserData(data.data);
            break;
          case 'project':
            setTimeByProjectData(data.data);
            break;
          case 'date':
            setTimeByDateData(data.data);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'csv') => {
    try {
      setIsExporting(true);

      const params = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        format,
      });

      let endpoint = '';
      let filename = '';
      switch (reportType) {
        case 'user':
          endpoint = 'time-by-user';
          filename = 'time-by-user';
          break;
        case 'project':
          endpoint = 'time-by-project';
          filename = 'time-by-project';
          break;
        case 'date':
          endpoint = 'time-by-date';
          filename = 'time-by-date';
          break;
      }

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/reports/${endpoint}?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export report');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('An error occurred while exporting');
    } finally {
      setIsExporting(false);
    }
  };

  const renderUserReport = () => {
    if (timeByUserData.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No data available for the selected date range</p>
        </Card>
      );
    }

    const chartData = timeByUserData.slice(0, 10).map((item) => ({
      name: item.userName,
      hours: parseFloat(item.totalHours.toFixed(2)),
      entries: item.entryCount,
    }));

    const pieData = timeByUserData.slice(0, 5).map((item, index) => ({
      name: item.userName,
      value: parseFloat(item.totalHours.toFixed(2)),
      fill: COLORS[index % COLORS.length],
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by User</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#3B82F6" name="Total Hours" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Contributors</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}h`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeByUserData.map((item) => (
                  <tr key={item.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalHours.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.entryCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderProjectReport = () => {
    if (timeByProjectData.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No data available for the selected date range</p>
        </Card>
      );
    }

    const chartData = timeByProjectData.slice(0, 10).map((item) => ({
      name: item.projectName,
      hours: parseFloat(item.totalHours.toFixed(2)),
      entries: item.entryCount,
    }));

    const pieData = timeByProjectData.slice(0, 5).map((item, index) => ({
      name: item.projectName,
      value: parseFloat(item.totalHours.toFixed(2)),
      fill: COLORS[index % COLORS.length],
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#10B981" name="Total Hours" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Projects</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}h`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Members
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeByProjectData.map((item) => (
                  <tr key={item.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalHours.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.entryCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.userBreakdown.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderDateReport = () => {
    if (timeByDateData.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No data available for the selected date range</p>
        </Card>
      );
    }

    const chartData = timeByDateData.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: parseFloat(item.totalHours.toFixed(2)),
      entries: item.entryCount,
    }));

    return (
      <div className="space-y-6">
        {/* Line Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#8B5CF6" name="Total Hours" />
              <Line type="monotone" dataKey="entries" stroke="#EC4899" name="Entries" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Detailed Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeByDateData.map((item) => (
                  <tr key={item.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(item.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalHours.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.entryCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Visualize and analyze time tracking data</p>
        </div>
        <Button onClick={() => handleExport('csv')} isLoading={isExporting}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.totalHours.toFixed(1)}h
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {summaryStats.averagePerDay.toFixed(1)}h/day
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Entries</p>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.entryCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {summaryStats.averagePerEntry.toFixed(0)}min/entry
                </p>
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Contributors</p>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.userCount}</p>
                <p className="text-xs text-gray-500 mt-1">{summaryStats.projectCount} projects</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">By User</option>
              <option value="project">By Project</option>
              <option value="date">By Date</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading report data...</p>
        </Card>
      ) : (
        <>
          {reportType === 'user' && renderUserReport()}
          {reportType === 'project' && renderProjectReport()}
          {reportType === 'date' && renderDateReport()}
        </>
      )}
    </div>
  );
}
