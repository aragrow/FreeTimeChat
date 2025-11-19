# AfricAI Digital Books

## Intelligent Time Tracking, Accounting & Business Management Platform

---

## Mission Statement

**Democratizing access to professional business tools for micro and small
businesses across Africa.**

AfricAI Digital Books provides free, basic digital tools that empower African
entrepreneurs to manage their time, finances, and business growth. We eliminate
cost barriers to micro and small businesses by offering comprehensive time
tracking, invoicing, payments, and accounting features at no charge—tools that
were previously only accessible to well-funded companies. Through conversational
AI, we make these powerful capabilities simple enough for anyone to use.

---

## Philosophy

### Core Beliefs

1. **Tools should be invisible** - The best tools are the ones you barely notice
   using. Traditional time tracking creates cognitive overhead that reduces
   productivity.

2. **AI should augment, not replace** - Our conversational interface enhances
   human capability by handling tedious data entry while keeping humans in
   control of decisions.

3. **Privacy by architecture** - Each client gets their own isolated database.
   Data breaches can't cascade. Compliance is built into the foundation.

4. **Developer-first, user-centric** - Clean, type-safe code enables rapid
   iteration. Beautiful interfaces make complex tasks simple.

---

## Key Features

### Natural Language Time Tracking

- **Conversational Interface**: "I spent 3 hours on the Johnson project this
  morning"
- **Context-Aware**: AI remembers your projects, clients, and work patterns
- **Smart Suggestions**: Predicts billable vs. non-billable based on history

### Multi-Tenant Architecture

- **Database-Per-Tenant**: Complete data isolation for enterprise clients
- **Role-Based Access Control**: Granular permissions with allow/deny
  capabilities
- **White-Label Ready**: Each tenant can customize their experience

### Comprehensive Accounting System

- **Invoice Management**: Professional invoicing with line items, taxes, and
  discounts
- **Payment Processing**: Multiple payment methods, partial payments, payment
  tracking
- **Discount & Coupon System**: Percentage or fixed discounts, usage limits,
  date ranges
- **Financial Reports**: Revenue tracking, outstanding invoices, payment history
- **Multi-Currency Support**: Handle international clients seamlessly

### Project & Business Management

- **Project Management**: Tasks, milestones, team assignments
- **Expense Tracking**: Receipt OCR with AI-powered categorization
- **Time-to-Invoice**: Convert tracked hours directly to invoices
- **Reports**: Billable hours, project profitability, team utilization

### Enterprise Security

- **Two-Factor Authentication**: TOTP with backup codes
- **OAuth Integration**: Google SSO for seamless onboarding
- **Admin Impersonation**: Support users without sharing passwords
- **Audit Logging**: Complete trail of system changes
- **Admin-Only Access Controls**: Sensitive areas (tenants, roles, capabilities)
  restricted to system administrators
- **Role-Based Page Protection**: Granular access control at the UI level

### Tenant Configuration

- **Invoice Address Management**: Separate business and invoice addresses with
  complete contact information
- **Tax ID Support**: Store and display tax identification for compliance
- **Payment Method Configuration**: Stripe and PayPal integration with sandbox
  support
- **Custom Invoice Numbering**: Configurable prefixes and auto-incrementing
  invoice numbers
- **Multi-Currency Settings**: Per-tenant currency configuration with 20+
  supported currencies
- **Logo & Branding**: Custom logo support for white-label invoicing

### User Experience

- **Collapsible Navigation**: Organized sections (Business, Account Receivables,
  Account Payables, etc.) with persistent state
- **Responsive Admin Dashboard**: Clean, organized interface for all
  administrative functions
- **Contextual Navigation**: Smart grouping of related features for intuitive
  access

### AI-Powered Intelligence

- **Multiple LLM Providers**: OpenAI, Anthropic, Google Gemini, Perplexity
- **Semantic Memory**: Contextual understanding of past conversations
- **Long-Term Memory**: Persistent user preferences and patterns

---

## Technology Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | Next.js 16, React 18, TypeScript |
| Backend  | Express.js, TypeScript           |
| Database | PostgreSQL with Prisma ORM       |
| Caching  | Redis                            |
| Build    | Turbo (monorepo), pnpm           |
| Auth     | JWT (RS256), Passport.js         |
| AI       | Multi-provider LLM integration   |

---

## Market Opportunity

### Target Segments

1. **Professional Services** - Consultants, agencies, law firms
2. **Freelancers & Contractors** - Individuals billing multiple clients
3. **SMB Teams** - 10-100 employee companies needing time visibility
4. **Enterprise** - Large organizations requiring tenant isolation

### Competitive Advantages

- **Conversational UX**: 10x faster than form-based competitors
- **True Multi-Tenancy**: Not just row-level security
- **Open Architecture**: Self-host or use our cloud
- **LLM Flexibility**: Not locked into one AI provider

---

## Pricing Model

### SaaS Tiers (Planned)

| Tier         | Price       | Users | Features                                                  |
| ------------ | ----------- | ----- | --------------------------------------------------------- |
| Starter      | Free        | 1-5   | Time tracking, basic invoicing, reports, and integrations |
| Professional | $19/mo      | 6-25  | Same as Started                                           |
| Business     | $29/user/mo | 26-50 | Same as Started                                           |

### Self-Hosted

- **Open Core**: Core time tracking and accounting free and open source
- **Support Contracts**: Available for mission-critical deployments

---

## Roadmap

### Q1 2026 - Foundation ✓

- Core time tracking with AI chat
- **Comprehensive accounting system** (invoices, payments, discounts, coupons)
- Multi-tenant authentication with RBAC
- Products/services catalog with image support
- **Tenant settings** (invoice address, tax ID, payment methods, branding)
- **Admin dashboard** with collapsible navigation and role-based access
- **User management** with account requests and approval workflow

### Q3 2026 - Integration

- Calendar sync (Google, Outlook)
- Accounting integrations (QuickBooks, Xero)
- Mobile apps (iOS, Android)

### Q1 2027 - Intelligence

- Predictive time entry suggestions
- Project profitability forecasting
- Team workload optimization

### Q3 2027 - Scale

- Real-time collaboration
- Custom workflow automation
- Marketplace for integrations

---

## Traction & Metrics

### Current State

- **Codebase**: 60,000+ lines of production TypeScript
- **Architecture**: Fully functional multi-tenant system with
  database-per-tenant isolation
- **Features**: 40+ pages of functionality across admin and user interfaces
- **Models**: 25+ database models across main/tenant schemas
- **Navigation**: 8 organized sections with 30+ navigation items

### Technical Achievements

- Type-safe end-to-end with shared types package
- Automated testing infrastructure
- CI/CD with Husky, lint-staged, conventional commits
- Comprehensive API documentation

---

## Investment Opportunity

### Use of Funds

| Allocation | Purpose                                  |
| ---------- | ---------------------------------------- |
| 40%        | Engineering (mobile, integrations)       |
| 30%        | Go-to-Market (sales, marketing)          |
| 20%        | Infrastructure (hosting, security audit) |
| 10%        | Operations (legal, accounting)           |

### Seeking

- **Seed Round**: $500K - $1M
- **Strategic Partners**: Time tracking, accounting, HR software
- **Contributors**: Full-stack TypeScript developers

---

## Team & Contact

AfricAI Digital Books is built by developers who understand the pain of time
tracking firsthand. We're looking for contributors who share our vision of
making time tracking invisible.

### Contributing

We welcome contributions in:

- **Code**: New features, bug fixes, performance improvements
- **Documentation**: User guides, API docs, tutorials
- **Design**: UX improvements, accessibility
- **Testing**: Unit tests, integration tests, E2E

### Get Involved

- **GitHub**: Star the repo, open issues, submit PRs
- **Discord**: Join our community (coming soon)
- **Email**: investors@freetimechat.com

---

## Why AfricAI Digital Books?

> "The best time tracking is the time tracking you don't notice."

Traditional tools fail because they interrupt flow. Spreadsheets fail because
they're tedious. We succeed by meeting users where they are - in conversation -
and handling the complexity behind the scenes.

**Join us in building the future of work management.**

---

_AfricAI Digital Books - Track less. Achieve more._
