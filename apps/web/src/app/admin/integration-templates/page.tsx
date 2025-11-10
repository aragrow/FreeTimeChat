'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api-service';

interface IntegrationTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  provider: string;
  iconUrl?: string;
  documentationUrl?: string;
  configSchema: any;
  defaultConfig?: any;
  requiredCapabilities: string[];
  isActive: boolean;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const CATEGORIES = [
  'AI',
  'EMAIL',
  'VECTOR_DB',
  'PAYMENT',
  'MONITORING',
  'STORAGE',
  'COMMUNICATION',
  'ANALYTICS',
  'OTHER',
];

export default function IntegrationTemplatesPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<IntegrationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IntegrationTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'AI',
    description: '',
    provider: '',
    iconUrl: '',
    documentationUrl: '',
    configSchema: '{}',
    defaultConfig: '{}',
    requiredCapabilities: '',
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await apiService.get<IntegrationTemplate[]>('/admin/integration-templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        configSchema: JSON.parse(formData.configSchema),
        defaultConfig: formData.defaultConfig ? JSON.parse(formData.defaultConfig) : null,
        requiredCapabilities: formData.requiredCapabilities
          ? formData.requiredCapabilities.split(',').map((s) => s.trim())
          : [],
      };

      if (editingTemplate) {
        await apiService.patch(`/admin/integration-templates/${editingTemplate.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await apiService.post('/admin/integration-templates', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setShowModal(false);
      fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please check your input and try again.');
    }
  };

  const handleEdit = (template: IntegrationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      slug: template.slug,
      category: template.category,
      description: template.description || '',
      provider: template.provider,
      iconUrl: template.iconUrl || '',
      documentationUrl: template.documentationUrl || '',
      configSchema: JSON.stringify(template.configSchema, null, 2),
      defaultConfig: template.defaultConfig
        ? JSON.stringify(template.defaultConfig, null, 2)
        : '{}',
      requiredCapabilities: template.requiredCapabilities.join(', '),
      isActive: template.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await apiService.delete(`/admin/integration-templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      category: 'AI',
      description: '',
      provider: '',
      iconUrl: '',
      documentationUrl: '',
      configSchema: '{}',
      defaultConfig: '{}',
      requiredCapabilities: '',
      isActive: true,
    });
    setEditingTemplate(null);
  };

  return (
    <AppLayout title="Integration Templates">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage integration templates for external services
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Template
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{template.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{template.provider}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          template.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {template.isSeeded && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Seeded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      {!template.isSeeded && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Provider</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Icon URL</label>
                    <input
                      type="url"
                      value={formData.iconUrl}
                      onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Documentation URL</label>
                    <input
                      type="url"
                      value={formData.documentationUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, documentationUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Config Schema (JSON)</label>
                  <textarea
                    value={formData.configSchema}
                    onChange={(e) => setFormData({ ...formData, configSchema: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Config (JSON)</label>
                  <textarea
                    value={formData.defaultConfig}
                    onChange={(e) => setFormData({ ...formData, defaultConfig: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Required Capabilities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.requiredCapabilities}
                    onChange={(e) =>
                      setFormData({ ...formData, requiredCapabilities: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
