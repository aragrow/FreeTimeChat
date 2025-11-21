'use client';

import Link from 'next/link';
import type { LanguageCode } from '@/contexts/TranslationContext';
import { SUPPORTED_LANGUAGES } from '@/contexts/TranslationContext';
import af from '@/locales/af.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import it from '@/locales/it.json';
import nl from '@/locales/nl.json';

const translations = { en, es, fr, de, nl, it, af };

// Custom AfricAI Digital Books Logo SVG
function AfricAILogo() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-32 w-32 md:h-40 md:w-40"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Book Base */}
      <path
        d="M30 50 L100 30 L170 50 L170 160 L100 180 L30 160 Z"
        fill="url(#gradient1)"
        className="drop-shadow-lg"
      />

      {/* Book Spine */}
      <path d="M100 30 L100 180" stroke="#1e40af" strokeWidth="4" />

      {/* Left Page */}
      <path d="M35 55 L95 38 L95 170 L35 155 Z" fill="white" className="drop-shadow-md" />

      {/* Right Page */}
      <path d="M105 38 L165 55 L165 155 L105 170 Z" fill="white" className="drop-shadow-md" />

      {/* AI Circuit Lines on Left Page */}
      <g stroke="#3b82f6" strokeWidth="2" fill="none">
        <line x1="45" y1="70" x2="85" y2="60" />
        <line x1="45" y1="90" x2="85" y2="80" />
        <line x1="45" y1="110" x2="75" y2="100" />
        <circle cx="45" cy="70" r="3" fill="#3b82f6" />
        <circle cx="45" cy="90" r="3" fill="#3b82f6" />
        <circle cx="45" cy="110" r="3" fill="#3b82f6" />
      </g>

      {/* AI Brain Icon on Right Page */}
      <g transform="translate(115, 80)">
        <circle cx="20" cy="20" r="18" fill="url(#gradient2)" />
        <path
          d="M12 15 Q15 10 20 12 Q25 10 28 15 M12 25 Q15 30 20 28 Q25 30 28 25 M10 20 L14 20 M26 20 L30 20"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface LandingPageProps {
  lang: LanguageCode;
}

export function LandingPage({ lang }: LandingPageProps) {
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, { flag }]) => (
            <Link
              key={code}
              href={code === 'en' ? '/' : `/${code}`}
              className={`px-3 py-2 rounded transition-colors ${
                code === lang
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={SUPPORTED_LANGUAGES[code as LanguageCode].nativeName}
            >
              {flag}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <AfricAILogo />
          </div>

          {/* Title */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t.landing.title}
            </span>
          </h1>

          {/* Tagline */}
          <p className="mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-300 md:text-2xl">
            {t.landing.tagline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              {t.landing.loginButton}
            </Link>
            <Link
              href="/request-account"
              className="rounded-full border-2 border-blue-600 bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-md transition-all hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
            >
              {t.landing.requestAccountButton}
            </Link>
          </div>
        </div>
      </section>

      {/* What It Does Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">
            {t.landing.whatIsTitle}
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">📒</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                {t.landing.features.expenseTracking.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.landing.features.expenseTracking.description}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">⏱️</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                {t.landing.features.timeManagement.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.landing.features.timeManagement.description}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                {t.landing.features.accounting.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.landing.features.accounting.description}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">🤖</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                {t.landing.features.aiInsights.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t.landing.features.aiInsights.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tier Section - Highlighted */}
      <section className="bg-gradient-to-r from-green-500 to-emerald-600 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.landing.freeTier.title}</h2>
            <div className="mb-8 text-2xl font-semibold">
              <p className="mb-4">{t.landing.freeTier.criteria1}</p>
              <p>{t.landing.freeTier.criteria2}</p>
            </div>
            <p className="text-xl opacity-90">{t.landing.freeTier.description}</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
            {t.landing.mission.title}
          </h2>
          <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
            <p className="mb-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {t.landing.mission.paragraph1}{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {t.landing.mission.principle}
              </span>
              .
            </p>
            <p className="mb-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {t.landing.mission.paragraph2}{' '}
              <span className="font-bold text-green-600 dark:text-green-400">
                {t.landing.mission.zeroBalance}
              </span>
              , {t.landing.mission.paragraph2End}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.landing.mission.paragraph3}
            </p>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">
              {t.landing.support.title}
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Sponsors */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">💎</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {t.landing.support.sponsor.title}
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  {t.landing.support.sponsor.description}
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  {t.landing.support.sponsor.button}
                </button>
              </div>

              {/* Angels */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">👼</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {t.landing.support.angel.title}
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  {t.landing.support.angel.description}
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  {t.landing.support.angel.button}
                </button>
              </div>

              {/* Volunteers */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">🚀</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {t.landing.support.volunteer.title}
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  {t.landing.support.volunteer.description}
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  {t.landing.support.volunteer.button}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t.landing.cta.title}
          </h2>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            {t.landing.cta.description}
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-green-600 px-10 py-4 text-xl font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            {t.landing.cta.button}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>{t.landing.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
