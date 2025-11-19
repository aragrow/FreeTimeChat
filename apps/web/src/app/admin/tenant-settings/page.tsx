/**
 * Admin Tenant Settings Page
 *
 * Tenant-specific settings for invoice configuration and branding
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface TenantSettings {
  id: string;
  name: string;
  currency: string;
  invoicePrefix: string | null;
  nextInvoiceNumber: number;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
  billingEmail: string | null;
}

export default function TenantSettingsPage() {
  const { fetchWithAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Form state
  const [currency, setCurrency] = useState('USD');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetchCurrencies();
    fetchSettings();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenant-settings/currencies`
      );

      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenant-settings`
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setCurrency(data.data.currency || 'USD');
        setInvoicePrefix(data.data.invoicePrefix || '');
        setNextInvoiceNumber(data.data.nextInvoiceNumber || 1);
        setLogoUrl(data.data.logoUrl || '');
      } else {
        setMessage({ type: 'error', text: 'Failed to load tenant settings' });
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      setMessage({ type: 'error', text: 'An error occurred while loading settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/tenant-settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currency,
            invoicePrefix: invoicePrefix || null,
            nextInvoiceNumber,
            logoUrl: logoUrl || null,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setMessage({
          type: 'success',
          text: 'Tenant settings updated successfully',
        });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update settings' });
      }
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
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
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure invoice settings and branding for {settings?.name || 'your organization'}
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

        <div className="space-y-6">
          {/* Invoice Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h2>

            <div className="space-y-4">
              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Default currency for invoices and financial reports
                </p>
              </div>

              {/* Invoice Prefix */}
              <div>
                <label
                  htmlFor="invoicePrefix"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Invoice Prefix
                </label>
                <input
                  id="invoicePrefix"
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="e.g., INV-, ARAG-"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Prefix added to invoice numbers (e.g., &quot;INV-0001&quot;)
                </p>
              </div>

              {/* Next Invoice Number */}
              <div>
                <label
                  htmlFor="nextInvoiceNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Next Invoice Number
                </label>
                <input
                  id="nextInvoiceNumber"
                  type="number"
                  min="1"
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The next invoice will use this number. Current preview:{' '}
                  <strong>
                    {invoicePrefix}
                    {String(nextInvoiceNumber).padStart(4, '0')}
                  </strong>
                </p>
              </div>
            </div>
          </Card>

          {/* Branding Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>

            <div className="space-y-4">
              {/* Logo URL */}
              <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL to your company logo (displayed on invoices and reports)
                </p>
              </div>

              {/* Logo Preview */}
              {logoUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Logo Preview</p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <img
                      src={logoUrl}
                      alt="Company logo preview"
                      className="max-h-24 max-w-xs object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Link href="/admin/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
