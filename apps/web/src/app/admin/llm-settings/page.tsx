/**
 * Admin LLM Settings Page
 *
 * Configure LLM provider settings for the system or tenant
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

interface LLMProvider {
  value: string;
  label: string;
}

interface LLMConfig {
  id: string;
  provider: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  baseUrl: string | null;
  organization: string | null;
  timeout: number;
  isActive: boolean;
  tenantId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function LLMSettingsPage() {
  const { fetchWithAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // LLM Configuration State
  const [activeConfig, setActiveConfig] = useState<LLMConfig | null>(null);
  const [providers, setProviders] = useState<LLMProvider[]>([]);

  // Form State
  const [provider, setProvider] = useState('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [baseUrl, setBaseUrl] = useState('');
  const [organization, setOrganization] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    url: string;
    method: string;
    timestamp: string;
    status: number;
    statusText: string;
    response: any;
    error?: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Model options for each provider
  const modelOptions: Record<string, string[]> = {
    OPENAI: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    ANTHROPIC: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    GOOGLE_GEMINI: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    PERPLEXITY: [
      'sonar',
      'sonar-pro',
      'sonar-reasoning',
      'sonar-reasoning-pro',
      'sonar-deep-research',
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-huge-128k-online',
    ],
    ABACUS_AI: [],
  };

  useEffect(() => {
    loadProviders();
    loadActiveConfig();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/llm-config/providers`
      );

      if (response.ok) {
        const data = await response.json();
        setProviders(data.data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadActiveConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/llm-config/active`
      );

      if (response.ok) {
        const data = await response.json();
        setActiveConfig(data.data);
        // Populate form with active config
        setProvider(data.data.provider);
        setDefaultModel(data.data.defaultModel);
        setTemperature(data.data.temperature);
        setMaxTokens(data.data.maxTokens);
        setBaseUrl(data.data.baseUrl || '');
        setOrganization(data.data.organization || '');
        setApiKey(''); // Never show the actual API key
      } else if (response.status === 404) {
        // No active config - start in edit mode
        setIsEditing(true);
        setActiveConfig(null);
      }
    } catch (error) {
      console.error('Failed to load active config:', error);
      setIsEditing(true); // Start in edit mode if there's an error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!provider || !defaultModel) {
        setMessage({ type: 'error', text: 'Provider and Model are required' });
        setIsSaving(false);
        return;
      }

      if (!activeConfig && !apiKey) {
        setMessage({ type: 'error', text: 'API Key is required for new configuration' });
        setIsSaving(false);
        return;
      }

      const body: any = {
        defaultModel,
        temperature,
        maxTokens,
        baseUrl: baseUrl || null,
        organization: organization || null,
      };

      // Only include API key if it's provided (for create or update)
      if (apiKey) {
        body.apiKey = apiKey;
      }

      let response;
      if (activeConfig) {
        // Update existing config
        response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/llm-config/${activeConfig.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
      } else {
        // Create new config
        body.provider = provider;
        response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/admin/llm-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (response.ok) {
        setMessage({ type: 'success', text: 'LLM configuration saved successfully' });
        setIsEditing(false);
        setApiKey(''); // Clear API key input
        await loadActiveConfig();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!activeConfig) {
      setMessage({ type: 'error', text: 'Please save the configuration first' });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    const testUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/llm-config/${activeConfig.id}/test`;
    const timestamp = new Date().toISOString();

    try {
      const response = await fetchWithAuth(testUrl, {
        method: 'POST',
      });

      const responseData = await response.json();

      // Capture debug info
      setDebugInfo({
        url: testUrl,
        method: 'POST',
        timestamp,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
      });
      setShowDebug(true);

      if (response.ok) {
        setMessage({ type: 'success', text: responseData.message });
      } else {
        setMessage({ type: 'error', text: responseData.message || 'Connection test failed' });
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);

      // Capture error debug info
      setDebugInfo({
        url: testUrl,
        method: 'POST',
        timestamp,
        status: 0,
        statusText: 'Error',
        response: null,
        error: error.message || 'Network error',
      });
      setShowDebug(true);

      setMessage({ type: 'error', text: 'An error occurred while testing' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCancel = () => {
    if (activeConfig) {
      // Reset form to active config
      setProvider(activeConfig.provider);
      setDefaultModel(activeConfig.defaultModel);
      setTemperature(activeConfig.temperature);
      setMaxTokens(activeConfig.maxTokens);
      setBaseUrl(activeConfig.baseUrl || '');
      setOrganization(activeConfig.organization || '');
      setApiKey('');
      setIsEditing(false);
    } else {
      // Reset to defaults
      setProvider('OPENAI');
      setApiKey('');
      setDefaultModel('');
      setTemperature(0.7);
      setMaxTokens(2000);
      setBaseUrl('');
      setOrganization('');
    }
    setMessage(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading LLM settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">LLM Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure AI language model provider for chat functionality
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Configuration Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Provider Configuration</h2>
                {isEditing && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Edit Mode
                  </span>
                )}
                {!isEditing && activeConfig && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    View Mode
                  </span>
                )}
              </div>
              {!isEditing && activeConfig && (
                <p className="text-sm text-gray-500 mt-1">
                  Click "Edit Configuration" to make changes
                </p>
              )}
              {isEditing && !activeConfig && (
                <p className="text-sm text-gray-500 mt-1">Create your first LLM configuration</p>
              )}
            </div>
            {!isEditing && activeConfig && (
              <Button onClick={() => setIsEditing(true)} variant="primary" size="md">
                Edit Configuration
              </Button>
            )}
          </div>

          {/* Provider Selection */}
          <div className={`space-y-4 ${!isEditing && activeConfig ? 'opacity-75' : ''}`}>
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                Provider *
              </label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setDefaultModel(''); // Reset model when provider changes
                }}
                disabled={!isEditing || !!activeConfig}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {providers.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {activeConfig && (
                <p className="text-xs text-gray-500 mt-1">
                  Provider cannot be changed after creation. Create a new configuration to switch
                  providers.
                </p>
              )}
            </div>

            {/* API Key */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key {!activeConfig && '*'}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!isEditing}
                  placeholder={activeConfig ? 'Enter new API key to update' : 'Enter your API key'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">API keys are encrypted before storage</p>
            </div>

            {/* Model Selection */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              {modelOptions[provider]?.length > 0 ? (
                <select
                  id="model"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a model</option>
                  {modelOptions[provider].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="model"
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter model name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              )}
            </div>

            {/* Temperature */}
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {temperature.toFixed(2)}
              </label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                disabled={!isEditing}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise (0.0)</span>
                <span>Balanced (0.5)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                id="maxTokens"
                type="number"
                min="1"
                max="128000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum length of generated responses</p>
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Advanced Settings (Optional)
              </h3>

              {/* Base URL */}
              <div className="mb-4">
                <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL
                </label>
                <input
                  id="baseUrl"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom API endpoint (leave blank for default)
                </p>
              </div>

              {/* Organization */}
              {provider === 'OPENAI' && (
                <div>
                  <label
                    htmlFor="organization"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Organization ID
                  </label>
                  <input
                    id="organization"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={!isEditing}
                    placeholder="org-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">OpenAI organization ID (optional)</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            )}

            {!isEditing && activeConfig && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button onClick={handleTest} disabled={isTesting}>
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Status Card */}
        {activeConfig && !isEditing && (
          <Card className="p-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Configuration Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium text-green-600">Active</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(activeConfig.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(activeConfig.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Scope:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {activeConfig.tenantId ? 'Tenant-specific' : 'System-wide'}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Debug Window */}
        {debugInfo && (
          <Card className="p-6 mt-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-blue-900">API Debug Information</h3>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showDebug ? 'Hide' : 'Show'}
              </button>
            </div>

            {showDebug && (
              <div className="space-y-4">
                {/* Request Info */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Request</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div>
                      <span className="text-gray-600">Method:</span>
                      <span className="ml-2 text-blue-600 font-semibold">{debugInfo.method}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">URL:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-xs break-all">
                        {debugInfo.url}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(debugInfo.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Response Info */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Response</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`ml-2 font-semibold ${
                          debugInfo.status >= 200 && debugInfo.status < 300
                            ? 'text-green-600'
                            : debugInfo.status >= 400
                              ? 'text-red-600'
                              : 'text-gray-900'
                        }`}
                      >
                        {debugInfo.status} {debugInfo.statusText}
                      </span>
                    </div>

                    {debugInfo.error && (
                      <div>
                        <span className="text-gray-600">Error:</span>
                        <div className="mt-1 p-2 bg-red-50 rounded border border-red-200 text-red-700 text-xs">
                          {debugInfo.error}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-600">Response Body:</span>
                      <div className="mt-1 p-3 bg-gray-900 rounded text-green-400 text-xs overflow-auto max-h-64">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(debugInfo.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setDebugInfo(null);
                      setShowDebug(false);
                    }}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Clear Debug Info
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Info Card */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About LLM Configuration</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>API keys are encrypted before being stored in the database</li>
            <li>Only one configuration can be active at a time per scope</li>
            <li>Test the connection after saving to ensure proper configuration</li>
            <li>Temperature controls creativity: lower is more precise, higher is more creative</li>
            <li>Max tokens limits the length of AI responses</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
