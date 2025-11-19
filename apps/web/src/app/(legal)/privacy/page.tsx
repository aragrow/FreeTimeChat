/**
 * Privacy Policy Page
 */

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Last Updated: November 5, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              AfricAI Digital Books (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our time tracking application and related
              services (collectively, the &quot;Service&quot;).
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              1. Information We Collect
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-800">
                  1.1 Information You Provide
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Account Information:</strong> Name, email address, password, company
                    name
                  </li>
                  <li>
                    <strong>Profile Information:</strong> Job title, department, compensation type,
                    hourly rate
                  </li>
                  <li>
                    <strong>Time Tracking Data:</strong> Time entries, project assignments, task
                    descriptions, work notes
                  </li>
                  <li>
                    <strong>Chat Messages:</strong> Conversations with our chat interface for time
                    entry
                  </li>
                  <li>
                    <strong>Payment Information:</strong> Credit card details (processed securely
                    through our payment processor)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-800">
                  1.2 Automatically Collected Information
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Usage Data:</strong> Pages visited, features used, time spent on the
                    Service
                  </li>
                  <li>
                    <strong>Device Information:</strong> IP address, browser type, operating
                    system, device identifiers
                  </li>
                  <li>
                    <strong>Log Data:</strong> API requests, authentication attempts, errors
                  </li>
                  <li>
                    <strong>Cookies and Tracking:</strong> Session cookies, authentication tokens,
                    preference settings
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-800">
                  1.3 Information from Third Parties
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>OAuth Providers:</strong> If you sign in with Google, we receive your
                    name, email address, and profile picture from Google
                  </li>
                  <li>
                    <strong>Payment Processors:</strong> Transaction confirmations and payment
                    status
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Create and manage your account</li>
                <li>Process and track your time entries</li>
                <li>Generate reports and analytics</li>
                <li>Authenticate users and prevent fraud</li>
                <li>Send service-related communications and updates</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Process payments and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Enforce our Terms of Service</li>
                <li>Improve user experience through analytics</li>
              </ul>
            </div>
          </section>

          {/* 3. Data Storage and Security */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              3. Data Storage and Security
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Multi-Tenant Architecture:</strong> We employ a database-per-client
                architecture, ensuring your organization&apos;s data is physically isolated from
                other clients in separate PostgreSQL databases.
              </p>
              <p>
                <strong>Security Measures:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Encryption:</strong> Data encrypted at rest and in transit using
                  industry-standard protocols (TLS/SSL)
                </li>
                <li>
                  <strong>Authentication:</strong> Secure JWT-based authentication with RS256
                  asymmetric encryption
                </li>
                <li>
                  <strong>Password Security:</strong> Passwords hashed using bcrypt with salt
                </li>
                <li>
                  <strong>Access Controls:</strong> Role-based access control (RBAC) with granular
                  permissions
                </li>
                <li>
                  <strong>Two-Factor Authentication:</strong> Optional 2FA for enhanced account
                  security
                </li>
                <li>
                  <strong>Regular Audits:</strong> Security audits and vulnerability assessments
                </li>
              </ul>
              <p>
                <strong>Data Location:</strong> Your data is stored on secure servers in [Data
                Center Location]. We do not transfer data outside of [Region] without your consent.
              </p>
            </div>
          </section>

          {/* 4. Data Sharing and Disclosure */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              4. Data Sharing and Disclosure
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>We do not sell your personal information.</strong>
              </p>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Your Organization:</strong> Administrators in your organization can access
                  time entries, reports, and user data within their client account
                </li>
                <li>
                  <strong>Service Providers:</strong> Third-party vendors who help us provide the
                  Service (hosting, payment processing, email delivery)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or
                  government authority
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                  sale of assets
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly authorize us to share
                  your information
                </li>
              </ul>
            </div>
          </section>

          {/* 5. Your Rights and Choices */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              5. Your Rights and Choices
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of your personal information
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your account and data
                </li>
                <li>
                  <strong>Export:</strong> Download your data in a portable format (CSV, JSON)
                </li>
                <li>
                  <strong>Object:</strong> Object to certain processing of your data
                </li>
                <li>
                  <strong>Restrict:</strong> Request restriction of processing in certain
                  circumstances
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw consent where we rely on it for
                  processing
                </li>
              </ul>
              <p>To exercise these rights, contact us at privacy@freetimechat.com</p>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">6. Data Retention</h2>
            <div className="space-y-4 text-gray-700">
              <p>We retain your information for as long as:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your account is active</li>
                <li>Needed to provide the Service</li>
                <li>Required by law or for legitimate business purposes</li>
              </ul>
              <p>
                Upon account deletion, we retain your data for 30 days to allow for data recovery,
                after which it is permanently deleted unless we are legally required to retain it.
              </p>
              <p>
                <strong>Anonymized Data:</strong> We may retain anonymized, aggregated data
                indefinitely for analytics and service improvement.
              </p>
            </div>
          </section>

          {/* 7. Cookies and Tracking Technologies */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              7. Cookies and Tracking Technologies
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Essential Cookies:</strong> Enable core functionality (authentication,
                  session management)
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings and preferences
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Understand how you use the Service
                </li>
              </ul>
              <p>
                You can control cookies through your browser settings. Note that disabling essential
                cookies may affect Service functionality.
              </p>
            </div>
          </section>

          {/* 8. Third-Party Services */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              8. Third-Party Services
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>The Service may integrate with third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Google OAuth:</strong> For authentication (governed by Google&apos;s
                  Privacy Policy)
                </li>
                <li>
                  <strong>Payment Processors:</strong> For payment processing (Stripe, PayPal)
                </li>
                <li>
                  <strong>Analytics:</strong> For usage analytics (if implemented)
                </li>
              </ul>
              <p>
                These services have their own privacy policies, and we are not responsible for their
                practices.
              </p>
            </div>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">9. Children&apos;s Privacy</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                The Service is not intended for individuals under 16 years of age. We do not
                knowingly collect personal information from children. If you believe we have
                collected information from a child, please contact us immediately.
              </p>
            </div>
          </section>

          {/* 10. International Data Transfers */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              10. International Data Transfers
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                If you access the Service from outside the United States, your information may be
                transferred to, stored, and processed in the United States or other countries. By
                using the Service, you consent to such transfers.
              </p>
              <p>
                We take steps to ensure that your data receives adequate protection in accordance
                with applicable data protection laws.
              </p>
            </div>
          </section>

          {/* 11. California Privacy Rights */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              11. California Privacy Rights (CCPA)
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>California residents have additional rights under the CCPA:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to deletion of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
              </ul>
              <p>
                <strong>We do not sell your personal information.</strong>
              </p>
              <p>
                To exercise your CCPA rights, email privacy@freetimechat.com with &quot;CCPA
                Request&quot; in the subject line.
              </p>
            </div>
          </section>

          {/* 12. GDPR Rights (European Users) */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              12. GDPR Rights (European Users)
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                If you are in the European Economic Area (EEA), you have rights under the General
                Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right of access to your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Rights related to automated decision-making and profiling</li>
              </ul>
              <p>
                <strong>Legal Basis for Processing:</strong> We process your data based on:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contract performance (to provide the Service)</li>
                <li>Consent (where you have given consent)</li>
                <li>Legitimate interests (to improve and secure the Service)</li>
                <li>Legal obligations (to comply with laws)</li>
              </ul>
            </div>
          </section>

          {/* 13. Changes to Privacy Policy */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              13. Changes to This Privacy Policy
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email notification</li>
                <li>In-app notification</li>
                <li>Posting a notice on our website</li>
              </ul>
              <p>
                Your continued use of the Service after changes become effective constitutes
                acceptance of the revised Privacy Policy.
              </p>
            </div>
          </section>

          {/* 14. Contact Us */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">14. Contact Us</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please
                contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">AfricAI Digital Books Privacy Team</p>
                <p>Email: privacy@freetimechat.com</p>
                <p>Email: support@freetimechat.com</p>
                <p>Website: https://freetimechat.com/support</p>
              </div>
              <p className="mt-4">
                <strong>Data Protection Officer:</strong> dpo@freetimechat.com
              </p>
            </div>
          </section>

          {/* Footer */}
          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              By using AfricAI Digital Books, you acknowledge that you have read and understood this Privacy
              Policy.
            </p>
            <div className="mt-4 flex gap-4">
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 text-sm">
                Terms of Service
              </Link>
              <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
                Return to Home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
