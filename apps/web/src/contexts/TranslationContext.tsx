'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import type { ReactNode } from 'react';
// Import all language files
import af from '@/locales/af.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import hz from '@/locales/hz.json';
import it from '@/locales/it.json';
import nl from '@/locales/nl.json';

// Define supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  hz: { name: 'Otjiherero', nativeName: 'Otjiherero', flag: '🇳🇦' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Map language codes to their translation objects
const translations: Record<LanguageCode, typeof en> = {
  en,
  es,
  fr,
  de,
  nl,
  it,
  af,
  hz,
};

// Define the context type
interface TranslationContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  updateTenantSettings: (language: LanguageCode, dateFormat: string, timeZone: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof SUPPORTED_LANGUAGES;
  dateFormat: string;
  timeZone: string;
  formatDate: (date: Date | string, format?: string) => string;
}

// Create the context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Storage key for persisting language preference
const LANGUAGE_STORAGE_KEY = 'africai-language';

// Helper to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

// Helper to replace parameters in translated string
function replaceParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;

  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// Helper to format date according to format string
function formatDateString(date: Date, format: string, timeZone: string): string {
  // Create formatter with timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';

  // Apply format pattern
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('yyyy', year)
    .replace('mm', month)
    .replace('dd', day);
}

// Provider component
interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: LanguageCode;
}

export function TranslationProvider({
  children,
  defaultLanguage = 'en',
}: TranslationProviderProps) {
  const authContext = useContext(AuthContext);
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);
  const [dateFormat, setDateFormat] = useState<string>('MM/DD/YYYY');
  const [timeZone, setTimeZone] = useState<string>('America/New_York');

  // Initialize language settings when auth loads
  useEffect(() => {
    // Wait for auth context to be available
    if (!authContext) {
      return;
    }

    // If auth is still loading, wait
    if (authContext.isLoading) {
      return;
    }

    // Priority 1: Use tenant settings if authenticated
    if (authContext.user?.tenant) {
      const tenantLang = authContext.user.tenant.language as LanguageCode;
      if (tenantLang in SUPPORTED_LANGUAGES) {
        setLanguageState(tenantLang);
        setDateFormat(authContext.user.tenant.dateFormat);
        setTimeZone(authContext.user.tenant.timeZone);
        document.documentElement.lang = tenantLang;
      }
      return;
    }

    // Priority 2: Use saved preference from localStorage (only if no tenant)
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (savedLanguage && savedLanguage in SUPPORTED_LANGUAGES) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
      return;
    }

    // Priority 3: Try to detect browser language
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    if (browserLang in SUPPORTED_LANGUAGES) {
      setLanguageState(browserLang);
      document.documentElement.lang = browserLang;
    }
  }, [authContext]);

  // Save language preference when it changes
  const setLanguage = (lang: LanguageCode) => {
    if (lang in SUPPORTED_LANGUAGES) {
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Update document lang attribute
      document.documentElement.lang = lang;
    }
  };

  // Update tenant settings directly (called after saving tenant settings to avoid full refresh)
  const updateTenantSettings = (
    newLanguage: LanguageCode,
    newDateFormat: string,
    newTimeZone: string
  ) => {
    if (newLanguage in SUPPORTED_LANGUAGES) {
      setLanguageState(newLanguage);
      setDateFormat(newDateFormat);
      setTimeZone(newTimeZone);
      document.documentElement.lang = newLanguage;
    }
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    // Get translation from current language
    let translation = getNestedValue(translations[language] as Record<string, unknown>, key);

    // Fall back to English if translation not found
    if (translation === undefined && language !== 'en') {
      translation = getNestedValue(translations.en as Record<string, unknown>, key);
    }

    // Return key if no translation found (helps identify missing translations)
    if (translation === undefined) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }

    // Replace parameters
    return replaceParams(translation, params);
  };

  // Date formatting function
  const formatDate = (date: Date | string, format?: string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formatToUse = format || dateFormat;
    return formatDateString(dateObj, formatToUse, timeZone);
  };

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        updateTenantSettings,
        t,
        languages: SUPPORTED_LANGUAGES,
        dateFormat,
        timeZone,
        formatDate,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

// Custom hook for using translations
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

// Export type for the translation function
export type TranslationFunction = (key: string, params?: Record<string, string | number>) => string;
