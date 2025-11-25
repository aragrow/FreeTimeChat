/**
 * Invoice Generation Page
 *
 * Generates invoices from billable time entries grouped by client and project
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface Client {
  id: string;
  name: string;
  invoicePrefix: string | null;
}

interface Project {
  id: string;
  name: string;
  clientId: string | null;
  client: Client | null;
  isBillableProject: boolean;
}

interface TimeEntry {
  id: string;
  description: string | null;
  hours: number;
  hourlyRate: number;
  date: string;
  project: Project;
}

interface PreviewProject {
  projectId: string;
  projectName: string;
  entries: TimeEntry[];
  totalHours: number;
  totalAmount: number;
}

interface PreviewInvoice {
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  projects: PreviewProject[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  totalAmount: number;
  status: string;
}

export default function GenerateInvoicesPage() {
  const { fetchWithAuth } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');

  // Preview states
  const [previewInvoices, setPreviewInvoices] = useState<PreviewInvoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchProjects();

    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/clients?limit=100`);

      if (response.ok) {
        const result = await response.json();
        setClients(result.data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?limit=100&isBillable=true`);

      if (response.ok) {
        const result = await response.json();
        // Only billable projects
        const billableProjects = (result.data.projects || []).filter(
          (p: Project) => p.isBillableProject
        );
        setProjects(billableProjects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // Filter projects by selected client
  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.clientId === selectedClientId)
    : projects;

  // Handle project selection
  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSelectAllProjects = () => {
    if (selectedProjectIds.length === filteredProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map((p) => p.id));
    }
  };

  // Preview invoices
  const handlePreview = async () => {
    if (!startDate || !endDate) {
      alert('Please select a date range');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId || undefined,
          projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
          startDate,
          endDate,
          taxRate: parseFloat(taxRate) || 0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewInvoices(result.data.invoices || []);
        setShowPreview(true);
        setShowResults(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to preview: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error previewing invoices:', error);
      alert('Failed to preview invoices');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate invoices
  const handleGenerate = async () => {
    if (previewInvoices.length === 0) {
      alert('No invoices to generate');
      return;
    }

    if (!confirm(`Generate ${previewInvoices.length} invoice(s)?`)) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/invoices/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId || undefined,
          projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
          startDate,
          endDate,
          taxRate: parseFloat(taxRate) || 0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedInvoices(result.data.invoices || []);
        setShowResults(true);
        setShowPreview(false);
        setPreviewInvoices([]);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      alert('Failed to generate invoices');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Invoices</h1>
          <p className="text-sm text-gray-600">Create invoices from billable time entries</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/invoices')}>
          Back to Invoices
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold mb-4">Filter Time Entries</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedProjectIds([]); // Reset project selection when client changes
              }}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.invoicePrefix && ` (${client.invoicePrefix})`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>

        {/* Project Selection */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Projects (Billable only)
            </label>
            <button
              type="button"
              onClick={handleSelectAllProjects}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedProjectIds.length === filteredProjects.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <p className="text-sm text-gray-500">
              {selectedClientId
                ? 'No billable projects for this client'
                : 'No billable projects available'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {filteredProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.includes(project.id)}
                    onChange={() => handleProjectToggle(project.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {project.name}
                    {!selectedClientId && project.client && (
                      <span className="text-gray-500"> ({project.client.name})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Preview Button */}
        <div className="flex justify-end">
          <Button onClick={handlePreview} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Preview Invoices
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Preview Results */}
      {showPreview && (
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Preview ({previewInvoices.length} invoice{previewInvoices.length !== 1 ? 's' : ''})
            </h2>
            {previewInvoices.length > 0 && (
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
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
                    Generate Invoices
                  </>
                )}
              </Button>
            )}
          </div>

          {previewInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
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
              <p>No billable time entries found for the selected criteria.</p>
              <p className="text-sm mt-1">Try adjusting the date range or project selection.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {previewInvoices.map((invoice, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {/* Invoice Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{invoice.clientName}</h3>
                        <p className="text-sm text-gray-600">Invoice: {invoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        {invoice.taxAmount > 0 && (
                          <p className="text-xs text-gray-500">
                            (Tax: {formatCurrency(invoice.taxAmount)})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="p-4">
                    {invoice.projects.map((project, pIndex) => (
                      <div key={pIndex} className="mb-4 last:mb-0">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-700">{project.projectName}</h4>
                          <span className="text-sm text-gray-600">
                            {formatHours(project.totalHours)} hrs -{' '}
                            {formatCurrency(project.totalAmount)}
                          </span>
                        </div>

                        {/* Time Entries */}
                        <div className="ml-4 space-y-1">
                          {project.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex justify-between text-sm text-gray-600"
                            >
                              <span>
                                {new Date(entry.date).toLocaleDateString()} -{' '}
                                {entry.description || 'No description'}
                              </span>
                              <span>
                                {formatHours(entry.hours)} hrs @ {formatCurrency(entry.hourlyRate)}
                                /hr
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Invoice Footer */}
                  <div className="bg-gray-50 px-4 py-3 border-t">
                    <div className="flex justify-end space-x-4 text-sm">
                      <span className="text-gray-600">
                        Subtotal: {formatCurrency(invoice.subtotal)}
                      </span>
                      {invoice.taxAmount > 0 && (
                        <span className="text-gray-600">
                          Tax ({invoice.taxRate}%): {formatCurrency(invoice.taxAmount)}
                        </span>
                      )}
                      <span className="font-semibold">
                        Total: {formatCurrency(invoice.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-800 font-medium">Total for all invoices</span>
                  <span className="text-xl font-bold text-blue-900">
                    {formatCurrency(previewInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Generation Results */}
      {showResults && generatedInvoices.length > 0 && (
        <Card className="p-6">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-green-500"
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
            <h2 className="text-xl font-semibold mb-2">Invoices Generated Successfully!</h2>
            <p className="text-gray-600 mb-6">
              {generatedInvoices.length} invoice{generatedInvoices.length !== 1 ? 's' : ''} created
            </p>

            <div className="max-w-md mx-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Invoice #</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="py-2">{inv.invoiceNumber}</td>
                      <td className="text-right py-2">{formatCurrency(inv.totalAmount)}</td>
                      <td className="text-center py-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResults(false);
                  setGeneratedInvoices([]);
                }}
              >
                Generate More
              </Button>
              <Button onClick={() => router.push('/admin/invoices')}>View All Invoices</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
