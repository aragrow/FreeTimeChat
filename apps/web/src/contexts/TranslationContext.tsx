'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
// Import all language files
import af from '@/locales/af.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
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
};

// Define the context type
interface TranslationContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof SUPPORTED_LANGUAGES;
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

// Provider component
interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: LanguageCode;
}

export function TranslationProvider({
  children,
  defaultLanguage = 'en',
}: TranslationProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (savedLanguage && savedLanguage in SUPPORTED_LANGUAGES) {
      setLanguageState(savedLanguage);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0] as LanguageCode;
      if (browserLang in SUPPORTED_LANGUAGES) {
        setLanguageState(browserLang);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save language preference when it changes
  const setLanguage = (lang: LanguageCode) => {
    if (lang in SUPPORTED_LANGUAGES) {
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Update document lang attribute
      document.documentElement.lang = lang;
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

  // Don't render children until language is initialized to prevent hydration mismatch
  if (!isInitialized) {
    return null;
  }

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
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
