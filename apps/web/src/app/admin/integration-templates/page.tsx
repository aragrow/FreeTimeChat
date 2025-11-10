'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

interface ConfigField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string;
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

const FIELD_TYPES = ['string', 'number', 'boolean', 'password', 'url', 'email'];

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
    requiredCapabilities: '',
    isActive: true,
  });
  const [configFields, setConfigFields] = useState<ConfigField[]>([]);
  const [defaultConfigPairs, setDefaultConfigPairs] = useState<
    Array<{ key: string; value: string }>
  >([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/integration-templates`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build config schema from fields
      const configSchema: any = {
        type: 'object',
        properties: {},
        required: [],
      };

      configFields.forEach((field) => {
        configSchema.properties[field.key] = {
          type:
            field.type === 'password' || field.type === 'url' || field.type === 'email'
              ? 'string'
              : field.type,
          description: field.label,
        };
        if (field.required) {
          configSchema.required.push(field.key);
        }
      });

      // Build default config from pairs
      const defaultConfig: any = {};
      defaultConfigPairs.forEach((pair) => {
        if (pair.key && pair.value) {
          defaultConfig[pair.key] = pair.value;
        }
      });

      const payload = {
        ...formData,
        configSchema,
        defaultConfig: Object.keys(defaultConfig).length > 0 ? defaultConfig : null,
        requiredCapabilities: formData.requiredCapabilities
          ? formData.requiredCapabilities.split(',').map((s) => s.trim())
          : [],
      };

      const url = editingTemplate
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/integration-templates/${editingTemplate.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/integration-templates`;

      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
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
      requiredCapabilities: template.requiredCapabilities.join(', '),
      isActive: template.isActive,
    });

    // Parse config schema into fields
    const schema = template.configSchema;
    if (schema && schema.properties) {
      const fields: ConfigField[] = Object.entries(schema.properties).map(
        ([key, prop]: [string, any]) => ({
          key,
          label: prop.description || key,
          type: prop.type || 'string',
          required: schema.required?.includes(key) || false,
          defaultValue: template.defaultConfig?.[key] || '',
        })
      );
      setConfigFields(fields);
    }

    // Parse default config into pairs
    if (template.defaultConfig) {
      const pairs = Object.entries(template.defaultConfig).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setDefaultConfigPairs(pairs);
    }

    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/integration-templates/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

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
      requiredCapabilities: '',
      isActive: true,
    });
    setConfigFields([]);
    setDefaultConfigPairs([]);
    setEditingTemplate(null);
  };

  const addConfigField = () => {
    setConfigFields([...configFields, { key: '', label: '', type: 'string', required: false }]);
  };

  const updateConfigField = (index: number, field: Partial<ConfigField>) => {
    const updated = [...configFields];
    updated[index] = { ...updated[index], ...field };
    setConfigFields(updated);
  };

  const removeConfigField = (index: number) => {
    setConfigFields(configFields.filter((_, i) => i !== index));
  };

  const addDefaultConfigPair = () => {
    setDefaultConfigPairs([...defaultConfigPairs, { key: '', value: '' }]);
  };

  const updateDefaultConfigPair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...defaultConfigPairs];
    updated[index][field] = value;
    setDefaultConfigPairs(updated);
  };

  const removeDefaultConfigPair = (index: number) => {
    setDefaultConfigPairs(defaultConfigPairs.filter((_, i) => i !== index));
  };

  return (
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
                  Fields
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {Object.keys(template.configSchema?.properties || {}).length} fields
                  </td>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'Add Template'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
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
                    <label className="block text-sm font-medium mb-1">Provider *</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
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
              </div>

              {/* Configuration Fields */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Configuration Fields</h3>
                  <button
                    type="button"
                    onClick={addConfigField}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-3">
                  {configFields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Key (e.g., apiKey)"
                          value={field.key}
                          onChange={(e) => updateConfigField(index, { key: e.target.value })}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Label (e.g., API Key)"
                          value={field.label}
                          onChange={(e) => updateConfigField(index, { label: e.target.value })}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateConfigField(index, { type: e.target.value })}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          {FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateConfigField(index, { required: e.target.checked })
                            }
                            className="mr-2"
                          />
                          Required
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConfigField(index)}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Configuration */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Default Configuration (Optional)</h3>
                  <button
                    type="button"
                    onClick={addDefaultConfigPair}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Pair
                  </button>
                </div>
                <div className="space-y-2">
                  {defaultConfigPairs.map((pair, index) => (
                    <div key={index} className="flex gap-2 bg-gray-50 p-2 rounded">
                      <input
                        type="text"
                        placeholder="Key"
                        value={pair.key}
                        onChange={(e) => updateDefaultConfigPair(index, 'key', e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={pair.value}
                        onChange={(e) => updateDefaultConfigPair(index, 'value', e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeDefaultConfigPair(index)}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Settings</h3>
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
                    placeholder="e.g., integration:create, integration:manage"
                  />
                </div>
                <div className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
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
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
