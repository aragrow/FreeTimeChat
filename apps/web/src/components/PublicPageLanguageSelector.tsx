'use client';

import { useRouter, usePathname } from 'next/navigation';
import type { LanguageCode } from '@/contexts/TranslationContext';
import { SUPPORTED_LANGUAGES, useTranslation } from '@/contexts/TranslationContext';

/**
 * Language Selector for Public Pages
 *
 * Displays a language selector in the top-right corner of public pages.
 * Routes to language-specific versions of the current page when changed.
 *
 * Routes:
 * - / → /es, /fr, /de, etc.
 * - /login → /es/login, /fr/login, etc.
 * - /register → /es/register, /fr/register, etc.
 * - /request-account → /es/request-account, /fr/request-account, etc.
 */
export function PublicPageLanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useTranslation();

  // Determine current language from pathname
  const getCurrentLang = (): LanguageCode => {
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];

    // Check if first segment is a language code
    if (firstSegment && firstSegment in SUPPORTED_LANGUAGES) {
      return firstSegment as LanguageCode;
    }

    // Check if we have a stored preference that matches a real language
    if (language in SUPPORTED_LANGUAGES) {
      return language;
    }

    return 'en';
  };

  // Get the base path without language prefix
  const getBasePath = (): string => {
    const segments = pathname.split('/').filter(Boolean);

    // If first segment is a language code, remove it
    if (segments.length > 0 && segments[0] in SUPPORTED_LANGUAGES) {
      segments.shift();
    }

    return segments.length > 0 ? `/${segments.join('/')}` : '/';
  };

  const currentLang = getCurrentLang();
  const basePath = getBasePath();

  const handleLanguageChange = (newLang: LanguageCode) => {
    // Update language in context (also saves to localStorage)
    setLanguage(newLang);

    // Only route for landing page, which has language-specific versions
    // Other pages like /login, /register use TranslationContext for language
    if (basePath === '/') {
      if (newLang === 'en') {
        router.push('/');
      } else {
        router.push(`/${newLang}`);
      }
    }
    // For non-landing pages, language change is handled by context without routing
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="flex flex-wrap gap-2 justify-end">
        {(Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]).map((code) => {
          const lang = SUPPORTED_LANGUAGES[code];
          return (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentLang === code
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              title={lang.name}
            >
              <span className="mr-1">{lang.flag}</span>
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
