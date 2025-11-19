import Link from 'next/link';

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
      <path
        d="M100 30 L100 180"
        stroke="#1e40af"
        strokeWidth="4"
      />

      {/* Left Page */}
      <path
        d="M35 55 L95 38 L95 170 L35 155 Z"
        fill="white"
        className="drop-shadow-md"
      />

      {/* Right Page */}
      <path
        d="M105 38 L165 55 L165 155 L105 170 Z"
        fill="white"
        className="drop-shadow-md"
      />

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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
              AfricAI Digital Books
            </span>
          </h1>

          {/* Tagline */}
          <p className="mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-300 md:text-2xl">
            Smart business management powered by AI
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Login to Get Started
            </Link>
            <Link
              href="/request-account"
              className="rounded-full border-2 border-blue-600 bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-md transition-all hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
            >
              Request an Account
            </Link>
          </div>
        </div>
      </section>

      {/* What It Does Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">
            What is AfricAI Digital Books?
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">📒</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Expense Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Scan receipts with AI to automatically extract and categorize expenses. No manual data entry.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">⏱️</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Time & Project Management
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track billable hours, manage projects, and generate invoices with intelligent automation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Accounting
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Manage invoices, track payments, and keep your books organized with simple financial tools.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">🤖</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                AI-Powered Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Chat with AI to query your business data, generate reports, and get actionable insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tier Section - Highlighted */}
      <section className="bg-gradient-to-r from-green-500 to-emerald-600 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">Always Free for Small Teams</h2>
            <div className="mb-8 text-2xl font-semibold">
              <p className="mb-4">✓ Companies with under 5 employees</p>
              <p>✓ Revenue under $25,000 per year</p>
            </div>
            <p className="text-xl opacity-90">
              No credit card required. No hidden fees. Just free time tracking and accounting for small teams,
              forever.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
          <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
            <p className="mb-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              AfricAI Digital Books is built on a simple principle:{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                great tools should be accessible to everyone
              </span>
              .
            </p>
            <p className="mb-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              All revenue from larger companies is reinvested directly into development, hosting,
              maintenance, and improvements. Our goal is to end each year at a{' '}
              <span className="font-bold text-green-600 dark:text-green-400">$0 balance</span>,
              ensuring every dollar goes back into making AfricAI Digital Books better for everyone.
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              No investors. No exit strategy. Just sustainable software for the long term.
            </p>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">
              Support Our Mission
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Sponsors */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">💎</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Sponsor</h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  Financial support to keep the lights on and features coming. Your logo on our
                  website and eternal gratitude.
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  Become a Sponsor
                </button>
              </div>

              {/* Angels */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">👼</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  Angel Supporter
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  One-time or recurring donations to support development. Every contribution helps
                  us stay independent.
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  Support as Angel
                </button>
              </div>

              {/* Volunteers */}
              <div className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:scale-105 dark:bg-gray-800">
                <div className="mb-4 text-5xl">🚀</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Volunteer</h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  Contribute code, design, documentation, or feedback. Help us build something
                  amazing together.
                </p>
                <button className="w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg">
                  Join as Volunteer
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
            Ready to streamline your business?
          </h2>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Join businesses using AI to manage expenses, track time, and gain insights.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-gradient-to-r from-blue-600 to-green-600 px-10 py-4 text-xl font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 AfricAI Digital Books. Built with ❤️ for small teams everywhere.</p>
        </div>
      </footer>
    </div>
  );
}
