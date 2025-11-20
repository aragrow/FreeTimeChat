'use client';

import { useState, useRef, useEffect } from 'react';
import type { LanguageCode } from '@/contexts/TranslationContext';
import { useTranslation } from '@/contexts/TranslationContext';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = 'dropdown',
  showFlag = true,
  showNativeName = true,
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages[language];

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {(Object.keys(languages) as LanguageCode[]).map((code) => {
          const lang = languages[code];
          return (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                language === code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showFlag && <span className="mr-1">{lang.flag}</span>}
              {showNativeName ? lang.nativeName : lang.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {showFlag && <span>{currentLang.flag}</span>}
        <span className="text-sm font-medium">
          {showNativeName ? currentLang.nativeName : currentLang.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {(Object.keys(languages) as LanguageCode[]).map((code) => {
            const lang = languages[code];
            return (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                  language === code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
                role="option"
                aria-selected={language === code}
              >
                {showFlag && <span>{lang.flag}</span>}
                <span>{showNativeName ? lang.nativeName : lang.name}</span>
                {language === code && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
