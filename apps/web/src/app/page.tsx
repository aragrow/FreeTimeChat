import Link from 'next/link';

// Custom FreeTimeChat Logo SVG
function FreeTimeChatLogo() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-32 w-32 md:h-40 md:w-40"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clock Circle */}
      <circle
        cx="100"
        cy="100"
        r="85"
        fill="none"
        stroke="url(#gradient1)"
        strokeWidth="6"
        className="drop-shadow-lg"
      />

      {/* Clock Face */}
      <circle cx="100" cy="100" r="70" fill="white" className="drop-shadow-md" />

      {/* Hour Marks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const radian = (angle * Math.PI) / 180;
        const x1 = 100 + 60 * Math.cos(radian);
        const y1 = 100 + 60 * Math.sin(radian);
        const x2 = 100 + 55 * Math.cos(radian);
        const y2 = 100 + 55 * Math.sin(radian);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}

      {/* Clock Hands - showing 10:10 (classic watch ad time) */}
      {/* Hour Hand */}
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="55"
        stroke="#1e40af"
        strokeWidth="6"
        strokeLinecap="round"
        className="drop-shadow"
      />
      {/* Minute Hand */}
      <line
        x1="100"
        y1="100"
        x2="130"
        y2="70"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        className="drop-shadow"
      />

      {/* Center Dot */}
      <circle cx="100" cy="100" r="6" fill="#1e40af" />

      {/* Chat Bubble */}
      <g transform="translate(135, 135)">
        <path
          d="M0,0 L40,0 C50,0 50,10 50,10 L50,30 C50,30 50,40 40,40 L15,40 L5,50 L5,40 C5,40 0,40 0,30 L0,10 C0,10 0,0 10,0 Z"
          fill="url(#gradient2)"
          className="drop-shadow-lg"
        />
        {/* Chat dots */}
        <circle cx="15" cy="20" r="3" fill="white" />
        <circle cx="25" cy="20" r="3" fill="white" />
        <circle cx="35" cy="20" r="3" fill="white" />
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
            <FreeTimeChatLogo />
          </div>

          {/* Title */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              FreeTimeChat
            </span>
          </h1>

          {/* Tagline */}
          <p className="mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-300 md:text-2xl">
            Time tracking made simple through natural conversation
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
            What is FreeTimeChat?
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">💬</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Chat Interface
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track time naturally by chatting. Simply tell us what you worked on, and we handle
                the rest.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">⏱️</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Smart Time Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatic time entry creation from your conversations. No complex forms or timers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Powerful Admin
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Complete web interface for managers to view reports, manage projects, and track team
                productivity.
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
              No credit card required. No hidden fees. Just free time tracking for small teams,
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
              FreeTimeChat is built on a simple principle:{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                great tools should be accessible to everyone
              </span>
              .
            </p>
            <p className="mb-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              All revenue from larger companies is reinvested directly into development, hosting,
              maintenance, and improvements. Our goal is to end each year at a{' '}
              <span className="font-bold text-green-600 dark:text-green-400">$0 balance</span>,
              ensuring every dollar goes back into making FreeTimeChat better for everyone.
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
            Ready to simplify your time tracking?
          </h2>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Join teams who track time through conversation instead of complex forms.
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
          <p>© 2025 FreeTimeChat. Built with ❤️ for small teams everywhere.</p>
        </div>
      </footer>
    </div>
  );
}
