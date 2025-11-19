/**
 * Terms of Service Page
 */

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600">Last Updated: November 5, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Welcome to AfricAI Digital Books. These Terms of Service (&quot;Terms&quot;) govern your access
              to and use of AfricAI Digital Books&apos;s time tracking application, website, and services
              (collectively, the &quot;Service&quot;). By accessing or using the Service, you agree
              to be bound by these Terms.
            </p>
          </section>

          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                By creating an account, accessing, or using AfricAI Digital Books, you acknowledge that you
                have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                If you do not agree to these Terms, you may not use the Service.
              </p>
              <p>
                If you are using the Service on behalf of an organization, you represent and
                warrant that you have the authority to bind that organization to these Terms.
              </p>
            </div>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              2. Description of Service
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                AfricAI Digital Books is a time tracking application that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chat-based time entry interface for employees</li>
                <li>Web-based administrative dashboard for managers</li>
                <li>Project and task management</li>
                <li>Time tracking and reporting</li>
                <li>Role-based access control (RBAC)</li>
                <li>Multi-tenant data isolation</li>
              </ul>
            </div>
          </section>

          {/* 3. Free Tier Eligibility */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              3. Free Tier Eligibility
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                AfricAI Digital Books offers a free tier for qualifying small businesses:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Companies with fewer than 5 employees</li>
                <li>Annual revenue under $25,000 USD</li>
              </ul>
              <p>
                You are responsible for accurately reporting your eligibility. Misrepresentation of
                your company size or revenue may result in immediate termination of service and
                retroactive billing.
              </p>
            </div>
          </section>

          {/* 4. User Accounts and Registration */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              4. User Accounts and Registration
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Account Creation:</strong> To use the Service, you must create an account
                by providing accurate, current, and complete information.
              </p>
              <p>
                <strong>Account Security:</strong> You are responsible for maintaining the
                confidentiality of your account credentials and for all activities that occur under
                your account. You must immediately notify us of any unauthorized use of your
                account.
              </p>
              <p>
                <strong>Account Types:</strong> The Service provides different account types with
                varying levels of access (administrators, managers, employees). Access permissions
                are controlled by your organization&apos;s administrators.
              </p>
            </div>
          </section>

          {/* 5. User Responsibilities */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              5. User Responsibilities
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate time entries and work-related information</li>
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Not attempt to gain unauthorized access to any part of the Service</li>
                <li>Not interfere with or disrupt the Service or servers</li>
                <li>Not use the Service to transmit viruses, malware, or harmful code</li>
                <li>Not impersonate another user or organization</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </div>
          </section>

          {/* 6. Data Privacy and Security */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              6. Data Privacy and Security
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Data Ownership:</strong> You retain ownership of all data you input into
                the Service. AfricAI Digital Books does not claim ownership of your time entries, projects,
                or other user-generated content.
              </p>
              <p>
                <strong>Data Isolation:</strong> We employ a multi-tenant architecture with
                database-per-client isolation to ensure your data is separated from other
                organizations.
              </p>
              <p>
                <strong>Data Processing:</strong> By using the Service, you consent to the
                collection, processing, and storage of your data as described in our Privacy Policy.
              </p>
              <p>
                <strong>Data Security:</strong> We implement industry-standard security measures to
                protect your data, including encryption at rest and in transit, secure
                authentication (JWT with RS256), and regular security audits.
              </p>
            </div>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              7. Intellectual Property
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>AfricAI Digital Books IP:</strong> The Service, including its design, code,
                features, and documentation, is owned by AfricAI Digital Books and protected by copyright,
                trademark, and other intellectual property laws.
              </p>
              <p>
                <strong>License Grant:</strong> Subject to these Terms, we grant you a limited,
                non-exclusive, non-transferable, revocable license to access and use the Service
                for your internal business purposes.
              </p>
              <p>
                <strong>Restrictions:</strong> You may not copy, modify, distribute, sell, or lease
                any part of the Service, nor may you reverse engineer or attempt to extract the
                source code.
              </p>
            </div>
          </section>

          {/* 8. Payment and Billing */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              8. Payment and Billing
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Free Tier:</strong> Qualifying organizations receive free access to the
                Service as described in Section 3.
              </p>
              <p>
                <strong>Paid Plans:</strong> Organizations not qualifying for the free tier will be
                billed according to our published pricing schedule. All fees are in USD and billed
                monthly or annually.
              </p>
              <p>
                <strong>Revenue Reinvestment:</strong> All revenue from paid plans is reinvested
                into development, hosting, maintenance, and improvements. Our goal is to end each
                year at a $0 balance, ensuring sustainable software for the long term.
              </p>
              <p>
                <strong>Refunds:</strong> Refunds are handled on a case-by-case basis. Please
                contact support for refund requests.
              </p>
            </div>
          </section>

          {/* 9. Prohibited Activities */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              9. Prohibited Activities
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction</li>
                <li>Infringe upon intellectual property rights of others</li>
                <li>Transmit spam, chain letters, or unsolicited communications</li>
                <li>
                  Collect or harvest information about other users without their consent
                </li>
                <li>Attempt to probe, scan, or test system vulnerabilities</li>
                <li>Circumvent authentication or security measures</li>
                <li>
                  Use automated systems (bots, scrapers) without our written permission
                </li>
              </ul>
            </div>
          </section>

          {/* 10. Service Availability */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              10. Service Availability
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the
                Service. The Service may be unavailable due to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Scheduled maintenance</li>
                <li>Emergency repairs</li>
                <li>Factors beyond our control (internet outages, server failures)</li>
              </ul>
              <p>
                We will provide advance notice of scheduled maintenance when possible.
              </p>
            </div>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              11. Limitation of Liability
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, FREETIMECHAT SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Any indirect, incidental, special, consequential, or punitive damages
                </li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Service interruptions or data loss</li>
                <li>Errors or inaccuracies in time entries or reports</li>
                <li>Unauthorized access to your account due to your negligence</li>
              </ul>
              <p>
                Our total liability to you for any claims arising from the Service shall not exceed
                the amount you paid us in the 12 months preceding the claim, or $100 USD for free
                tier users.
              </p>
            </div>
          </section>

          {/* 12. Disclaimer of Warranties */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              12. Disclaimer of Warranties
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that the Service will be error-free, secure, or uninterrupted, or
                that defects will be corrected.
              </p>
            </div>
          </section>

          {/* 13. Indemnification */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              13. Indemnification
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                You agree to indemnify, defend, and hold harmless AfricAI Digital Books, its officers,
                directors, employees, and agents from any claims, liabilities, damages, losses, and
                expenses arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your violation of these Terms</li>
                <li>Your violation of any law or third-party rights</li>
                <li>Your use or misuse of the Service</li>
                <li>Any content you submit to the Service</li>
              </ul>
            </div>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">14. Termination</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>By You:</strong> You may terminate your account at any time by contacting
                support or using the account deletion feature.
              </p>
              <p>
                <strong>By Us:</strong> We reserve the right to suspend or terminate your access to
                the Service at any time, with or without notice, for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of these Terms</li>
                <li>Suspected fraudulent, abusive, or illegal activity</li>
                <li>Extended periods of inactivity</li>
                <li>Non-payment of fees (for paid accounts)</li>
              </ul>
              <p>
                <strong>Effect of Termination:</strong> Upon termination, your right to access the
                Service will immediately cease. We will retain your data for 30 days to allow for
                data export, after which it will be permanently deleted unless legally required to
                retain it.
              </p>
            </div>
          </section>

          {/* 15. Data Export and Portability */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              15. Data Export and Portability
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                You may export your data at any time through the Service&apos;s export features.
                Data is provided in standard formats (CSV, JSON) to ensure portability.
              </p>
              <p>
                Upon account termination, you have 30 days to export your data before it is
                permanently deleted.
              </p>
            </div>
          </section>

          {/* 16. Changes to Terms */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">16. Changes to Terms</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email notification to your registered email address</li>
                <li>In-app notification upon your next login</li>
                <li>Posting a notice on our website</li>
              </ul>
              <p>
                Your continued use of the Service after such notification constitutes acceptance of
                the modified Terms. If you do not agree to the changes, you must stop using the
                Service and terminate your account.
              </p>
            </div>
          </section>

          {/* 17. Dispute Resolution */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              17. Dispute Resolution
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Informal Resolution:</strong> Before initiating formal proceedings, you
                agree to contact us to seek informal resolution of any disputes.
              </p>
              <p>
                <strong>Governing Law:</strong> These Terms shall be governed by and construed in
                accordance with the laws of the State of [Your State], United States, without
                regard to its conflict of law provisions.
              </p>
              <p>
                <strong>Arbitration:</strong> Any disputes arising from these Terms or the Service
                shall be resolved through binding arbitration in accordance with the American
                Arbitration Association&apos;s rules.
              </p>
            </div>
          </section>

          {/* 18. Miscellaneous */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">18. Miscellaneous</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy,
                constitute the entire agreement between you and AfricAI Digital Books.
              </p>
              <p>
                <strong>Severability:</strong> If any provision of these Terms is found to be
                invalid or unenforceable, the remaining provisions will remain in full force and
                effect.
              </p>
              <p>
                <strong>Waiver:</strong> Our failure to enforce any right or provision of these
                Terms will not be deemed a waiver of such right or provision.
              </p>
              <p>
                <strong>Assignment:</strong> You may not assign or transfer these Terms without our
                written consent. We may assign our rights and obligations without restriction.
              </p>
            </div>
          </section>

          {/* 19. Contact Information */}
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              19. Contact Information
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                If you have questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">AfricAI Digital Books Support</p>
                <p>Email: legal@freetimechat.com</p>
                <p>Email: support@freetimechat.com</p>
                <p>Website: https://freetimechat.com/support</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              By using AfricAI Digital Books, you acknowledge that you have read and understood these Terms
              of Service and agree to be bound by them.
            </p>
            <div className="mt-4 flex gap-4">
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 text-sm">
                Privacy Policy
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
