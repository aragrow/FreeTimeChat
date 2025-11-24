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
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/hooks/useAuth';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface NavigationConfig {
  enabledItems: string[];
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
  // Invoice address (appears on invoices)
  invoiceContact: string | null;
  invoiceEmail: string | null;
  invoicePhone: string | null;
  invoiceStreet: string | null;
  invoiceCity: string | null;
  invoiceState: string | null;
  invoiceZip: string | null;
  invoiceCountry: string | null;
  taxId: string | null;
  // Localization settings
  language: string;
  dateFormat: string;
  timeZone: string;
  // Payment methods
  enableStripe: boolean;
  enablePaypal: boolean;
  stripePublishableKey: string | null;
  paypalClientId: string | null;
  paypalSandbox: boolean;
  defaultPaymentMethod: string | null;
  // Navigation config
  navigationConfig: NavigationConfig | null;
}

// Define all navigation items that can be toggled
const NAVIGATION_ITEMS = {
  main: {
    label: 'Main',
    items: [
      { id: 'chat', label: 'Chat', description: 'AI chat assistant' },
      { id: 'time-entries', label: 'Time Entries', description: 'Track time spent on tasks' },
      { id: 'reports', label: 'Reports', description: 'View analytics and reports' },
    ],
  },
  business: {
    label: 'Business',
    items: [
      { id: 'clients', label: 'Clients', description: 'Manage customer accounts' },
      { id: 'projects', label: 'Projects', description: 'Project management' },
    ],
  },
  accountReceivables: {
    label: 'Account Receivables',
    items: [
      { id: 'invoices', label: 'Invoices', description: 'Create and manage invoices' },
      { id: 'payments', label: 'Payments', description: 'Track incoming payments' },
      { id: 'discounts', label: 'Discounts', description: 'Manage discount rules' },
      { id: 'coupons', label: 'Coupons', description: 'Create promotional coupons' },
      { id: 'products', label: 'Products', description: 'Product catalog' },
      { id: 'payment-terms', label: 'Payment Terms', description: 'Define payment conditions' },
    ],
  },
  accountPayables: {
    label: 'Account Payables',
    items: [
      { id: 'vendors', label: 'Vendors', description: 'Manage supplier accounts' },
      { id: 'bills', label: 'Bills', description: 'Track payable invoices' },
      { id: 'expenses', label: 'Expenses', description: 'Record business expenses' },
    ],
  },
  userManagement: {
    label: 'User Management',
    items: [
      { id: 'users', label: 'Users', description: 'Manage user accounts' },
      { id: 'account-requests', label: 'Account Requests', description: 'Review signup requests' },
      { id: 'tenants', label: 'Tenants', description: 'Manage tenant organizations' },
    ],
  },
  accessControl: {
    label: 'Access Control',
    items: [
      { id: 'roles', label: 'Roles', description: 'Define user roles' },
      { id: 'capabilities', label: 'Capabilities', description: 'Manage permissions' },
    ],
  },
  configuration: {
    label: 'Configuration',
    items: [
      {
        id: 'integration-templates',
        label: 'Integrations',
        description: 'External service integrations',
      },
      { id: 'llm-settings', label: 'LLM Settings', description: 'AI model configuration' },
      { id: 'system-settings', label: 'System Settings', description: 'Global system settings' },
    ],
  },
  monitoring: {
    label: 'Monitoring',
    items: [{ id: 'audit', label: 'Audit Log', description: 'View activity logs' }],
  },
};

// Get all item IDs for default state (all enabled)
const getAllItemIds = () => {
  const ids: string[] = [];
  Object.values(NAVIGATION_ITEMS).forEach((section) => {
    section.items.forEach((item) => ids.push(item.id));
  });
  return ids;
};

export default function TenantSettingsPage() {
  const { fetchWithAuth } = useAuth();
  const { updateTenantSettings } = useTranslation();
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
  // Localization settings state
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeZone, setTimeZone] = useState('America/New_York');
  // Invoice address state
  const [invoiceContact, setInvoiceContact] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [invoiceStreet, setInvoiceStreet] = useState('');
  const [invoiceCity, setInvoiceCity] = useState('');
  const [invoiceState, setInvoiceState] = useState('');
  const [invoiceZip, setInvoiceZip] = useState('');
  const [invoiceCountry, setInvoiceCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  // Payment methods state
  const [enableStripe, setEnableStripe] = useState(false);
  const [enablePaypal, setEnablePaypal] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalSandbox, setPaypalSandbox] = useState(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('');
  // Navigation settings state
  const [enabledNavItems, setEnabledNavItems] = useState<string[]>(getAllItemIds());

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
        // Localization settings
        setLanguage(data.data.language || 'en');
        setDateFormat(data.data.dateFormat || 'MM/DD/YYYY');
        setTimeZone(data.data.timeZone || 'America/New_York');
        // Invoice address
        setInvoiceContact(data.data.invoiceContact || '');
        setInvoiceEmail(data.data.invoiceEmail || '');
        setInvoicePhone(data.data.invoicePhone || '');
        setInvoiceStreet(data.data.invoiceStreet || '');
        setInvoiceCity(data.data.invoiceCity || '');
        setInvoiceState(data.data.invoiceState || '');
        setInvoiceZip(data.data.invoiceZip || '');
        setInvoiceCountry(data.data.invoiceCountry || '');
        setTaxId(data.data.taxId || '');
        // Payment methods
        setEnableStripe(data.data.enableStripe || false);
        setEnablePaypal(data.data.enablePaypal || false);
        setStripePublishableKey(data.data.stripePublishableKey || '');
        setPaypalClientId(data.data.paypalClientId || '');
        setPaypalSandbox(data.data.paypalSandbox ?? true);
        setDefaultPaymentMethod(data.data.defaultPaymentMethod || '');
        // Navigation config - default to all enabled if not set
        setEnabledNavItems(data.data.navigationConfig?.enabledItems || getAllItemIds());
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
            // Localization settings
            language,
            dateFormat,
            timeZone,
            // Invoice address
            invoiceContact: invoiceContact || null,
            invoiceEmail: invoiceEmail || null,
            invoicePhone: invoicePhone || null,
            invoiceStreet: invoiceStreet || null,
            invoiceCity: invoiceCity || null,
            invoiceState: invoiceState || null,
            invoiceZip: invoiceZip || null,
            invoiceCountry: invoiceCountry || null,
            taxId: taxId || null,
            // Payment methods
            enableStripe,
            enablePaypal,
            stripePublishableKey: stripePublishableKey || null,
            stripeSecretKey: stripeSecretKey || null,
            paypalClientId: paypalClientId || null,
            paypalClientSecret: paypalClientSecret || null,
            paypalSandbox,
            defaultPaymentMethod: defaultPaymentMethod || null,
            // Navigation config
            navigationConfig: { enabledItems: enabledNavItems },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setMessage({
          type: 'success',
          text: 'Tenant settings updated successfully. Changes will take full effect on next login.',
        });

        // Update translation settings immediately without full page refresh
        updateTenantSettings(language as any, dateFormat, timeZone);

        // Note: We don't call refreshUser() here to avoid blank screen issues
        // The new settings will be loaded from the database on next page refresh or login
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

  // Navigation item toggle handler
  const toggleNavItem = (itemId: string) => {
    setEnabledNavItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Toggle all items in a section
  const toggleSection = (sectionKey: string) => {
    const section = NAVIGATION_ITEMS[sectionKey as keyof typeof NAVIGATION_ITEMS];
    const sectionItemIds = section.items.map((item) => item.id);
    const allEnabled = sectionItemIds.every((id) => enabledNavItems.includes(id));

    if (allEnabled) {
      // Disable all items in section
      setEnabledNavItems((prev) => prev.filter((id) => !sectionItemIds.includes(id)));
    } else {
      // Enable all items in section
      setEnabledNavItems((prev) => [...new Set([...prev, ...sectionItemIds])]);
    }
  };

  // Check if all items in section are enabled
  const isSectionFullyEnabled = (sectionKey: string) => {
    const section = NAVIGATION_ITEMS[sectionKey as keyof typeof NAVIGATION_ITEMS];
    return section.items.every((item) => enabledNavItems.includes(item.id));
  };

  // Check if some items in section are enabled
  const isSectionPartiallyEnabled = (sectionKey: string) => {
    const section = NAVIGATION_ITEMS[sectionKey as keyof typeof NAVIGATION_ITEMS];
    const enabledCount = section.items.filter((item) => enabledNavItems.includes(item.id)).length;
    return enabledCount > 0 && enabledCount < section.items.length;
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
          {/* Invoice Address */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Address</h2>
            <p className="text-sm text-gray-500 mb-4">
              This information will appear on your invoices as the sender/from address.
            </p>

            <div className="space-y-4">
              {/* Contact & Tax ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={invoiceContact}
                    onChange={(e) => setInvoiceContact(e.target.value)}
                    placeholder="Your business name or contact"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / VAT Number
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g., 12-3456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Email
                  </label>
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="billing@yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Phone
                  </label>
                  <input
                    type="tel"
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={invoiceStreet}
                  onChange={(e) => setInvoiceStreet(e.target.value)}
                  placeholder="123 Main Street, Suite 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={invoiceCity}
                    onChange={(e) => setInvoiceCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={invoiceState}
                    onChange={(e) => setInvoiceState(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    value={invoiceZip}
                    onChange={(e) => setInvoiceZip(e.target.value)}
                    placeholder="12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={invoiceCountry}
                  onChange={(e) => setInvoiceCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Localization Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Localization Settings</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure language, date format, and timezone preferences for your organization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Language */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="nl">Nederlands (Dutch)</option>
                  <option value="it">Italiano (Italian)</option>
                  <option value="af">Afrikaans</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Interface language for all users in your organization
                </p>
              </div>

              {/* Date Format */}
              <div>
                <label
                  htmlFor="dateFormat"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date Format
                </label>
                <select
                  id="dateFormat"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">How dates will be displayed</p>
              </div>

              {/* Time Zone */}
              <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Zone
                </label>
                <select
                  id="timeZone"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <optgroup label="US Time Zones">
                    <option value="America/New_York">Eastern Time (UTC-5/-4)</option>
                    <option value="America/Chicago">Central Time (UTC-6/-5)</option>
                    <option value="America/Denver">Mountain Time (UTC-7/-6)</option>
                    <option value="America/Phoenix">Arizona (UTC-7)</option>
                    <option value="America/Los_Angeles">Pacific Time (UTC-8/-7)</option>
                    <option value="America/Anchorage">Alaska (UTC-9/-8)</option>
                    <option value="Pacific/Honolulu">Hawaii (UTC-10)</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Europe/London">London (UTC+0/+1)</option>
                    <option value="Europe/Paris">Paris (UTC+1/+2)</option>
                    <option value="Europe/Berlin">Berlin (UTC+1/+2)</option>
                    <option value="Europe/Amsterdam">Amsterdam (UTC+1/+2)</option>
                    <option value="Europe/Rome">Rome (UTC+1/+2)</option>
                    <option value="Europe/Madrid">Madrid (UTC+1/+2)</option>
                    <option value="Europe/Athens">Athens (UTC+2/+3)</option>
                    <option value="Europe/Moscow">Moscow (UTC+3)</option>
                  </optgroup>
                  <optgroup label="Asia">
                    <option value="Asia/Dubai">Dubai (UTC+4)</option>
                    <option value="Asia/Karachi">Karachi (UTC+5)</option>
                    <option value="Asia/Kolkata">Mumbai/Kolkata (UTC+5:30)</option>
                    <option value="Asia/Dhaka">Dhaka (UTC+6)</option>
                    <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                    <option value="Asia/Singapore">Singapore (UTC+8)</option>
                    <option value="Asia/Hong_Kong">Hong Kong (UTC+8)</option>
                    <option value="Asia/Shanghai">Beijing/Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                    <option value="Asia/Seoul">Seoul (UTC+9)</option>
                  </optgroup>
                  <optgroup label="Australia">
                    <option value="Australia/Perth">Perth (UTC+8)</option>
                    <option value="Australia/Adelaide">Adelaide (UTC+9:30/+10:30)</option>
                    <option value="Australia/Brisbane">Brisbane (UTC+10)</option>
                    <option value="Australia/Sydney">Sydney (UTC+10/+11)</option>
                    <option value="Australia/Melbourne">Melbourne (UTC+10/+11)</option>
                  </optgroup>
                  <optgroup label="Africa">
                    <option value="Africa/Cairo">Cairo (UTC+2)</option>
                    <option value="Africa/Johannesburg">Johannesburg (UTC+2)</option>
                    <option value="Africa/Nairobi">Nairobi (UTC+3)</option>
                    <option value="Africa/Lagos">Lagos (UTC+1)</option>
                  </optgroup>
                  <optgroup label="South America">
                    <option value="America/Sao_Paulo">São Paulo (UTC-3/-2)</option>
                    <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                    <option value="America/Santiago">Santiago (UTC-4/-3)</option>
                    <option value="America/Lima">Lima (UTC-5)</option>
                    <option value="America/Bogota">Bogotá (UTC-5)</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="UTC">UTC (UTC+0)</option>
                  </optgroup>
                </select>
                <p className="mt-1 text-xs text-gray-500">All timestamps will use this timezone</p>
              </div>
            </div>
          </Card>

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

          {/* Payment Methods Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>

            <div className="space-y-6">
              {/* Stripe */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Stripe</h3>
                    <p className="text-xs text-gray-500">Accept credit card payments via Stripe</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableStripe}
                      onChange={(e) => setEnableStripe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {enableStripe && (
                  <div className="space-y-3 ml-0">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publishable Key
                      </label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        placeholder="pk_live_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        placeholder="sk_live_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave blank to keep existing key</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PayPal */}
              <div className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">PayPal</h3>
                    <p className="text-xs text-gray-500">Accept payments via PayPal</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePaypal}
                      onChange={(e) => setEnablePaypal(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {enablePaypal && (
                  <div className="space-y-3 ml-0">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={paypalClientId}
                        onChange={(e) => setPaypalClientId(e.target.value)}
                        placeholder="Your PayPal Client ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={paypalClientSecret}
                        onChange={(e) => setPaypalClientSecret(e.target.value)}
                        placeholder="Your PayPal Client Secret"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave blank to keep existing secret
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="paypalSandbox"
                        checked={paypalSandbox}
                        onChange={(e) => setPaypalSandbox(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="paypalSandbox" className="text-sm text-gray-700">
                        Use Sandbox Mode (for testing)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Default Payment Method */}
              {(enableStripe || enablePaypal) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Payment Method
                  </label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No default (client chooses)</option>
                    {enableStripe && <option value="stripe">Stripe</option>}
                    {enablePaypal && <option value="paypal">PayPal</option>}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Default payment method for new clients
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Navigation Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Navigation Menu</h2>
                <p className="text-sm text-gray-500">
                  Choose which menu items to show. Disabled items will be hidden from the sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabledNavItems(getAllItemIds())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Enable All
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(NAVIGATION_ITEMS).map(([sectionKey, section]) => (
                <div key={sectionKey} className="border border-gray-200 rounded-lg p-4">
                  {/* Section header with toggle all */}
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isSectionFullyEnabled(sectionKey)}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isSectionPartiallyEnabled(sectionKey);
                        }
                      }}
                      onChange={() => toggleSection(sectionKey)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="font-medium text-gray-900">{section.label}</span>
                    <span className="text-xs text-gray-500">
                      ({section.items.filter((item) => enabledNavItems.includes(item.id)).length}/
                      {section.items.length} enabled)
                    </span>
                  </div>

                  {/* Individual items */}
                  <div className="ml-7 space-y-2">
                    {section.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded -ml-2"
                      >
                        <input
                          type="checkbox"
                          checked={enabledNavItems.includes(item.id)}
                          onChange={() => toggleNavItem(item.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Note: Tenant Settings will always remain accessible to administrators.
            </p>
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
