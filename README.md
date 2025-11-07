## Remcura V2

Remcura V2 is a multi-tenant inventory platform for medical practices. This repository uses a single Next.js 15
application with App Router, Tailwind CSS, and Prisma for data access.

### Stack

- [Next.js 15](https://nextjs.org/) with React Server Components
- Tailwind CSS for styling and lightweight Shadcn UI primitives
- PostgreSQL + Prisma ORM
- API route handlers colocated under `app/api`

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- npm (bundled with Node) or another package manager
- PostgreSQL instance (Docker or managed service)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Duplicate the environment template and provide secrets:

   ```bash
   cp .env.example .env.local
   ```
   
   **Required environment variables:**
   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_SECRET` – Random secret for NextAuth (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` – App URL (e.g., `http://localhost:3000`)
   - `RESEND_API_KEY` – API key from [Resend](https://resend.com) for password reset emails
   - `NEXT_PUBLIC_APP_URL` – Public app URL for email links (e.g., `http://localhost:3000`)

   **Optional environment variables:**
   - `REDIS_URL` – Redis connection URL for production rate limiting (omit for in-memory fallback)
   - `SENTRY_DSN` – Sentry DSN for server-side error tracking (omit to disable)
   - `NEXT_PUBLIC_SENTRY_DSN` – Sentry DSN for client-side error tracking (omit to disable)
   - `SENTRY_ORG` – Sentry organization slug (for source map uploads)
   - `SENTRY_PROJECT` – Sentry project slug (for source map uploads)
   - `SENTRY_AUTH_TOKEN` – Sentry auth token (for CI/CD source map uploads)

3. Push the Prisma schema to your database (creates tables):

   ```bash
   npm run db:push
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to see the landing page. The dashboard prototype lives at
   `/dashboard` and the health check at `/api/health`.

### Authentication & Authorization

- **Registration**: Use `/register` to create the first practice and administrator (credentials provider, password stored as bcrypt hash).
- **Sign In**: Use `/login` to authenticate. Protected routes require an authenticated session.
- **Role-Based Access Control (RBAC)**: The app supports three roles:
  - **ADMIN**: Full access to all features including settings and user management
  - **STAFF**: Can manage inventory, suppliers, and orders
  - **VIEWER**: Read-only access to all resources
- **Route Protection**: Middleware enforces role-based access. Unauthorized users are redirected to `/access-denied`.
- **Password Reset**: Users can request a password reset at `/forgot-password`. Reset links are valid for 60 minutes and are sent via Resend.

### Project Structure

- `app/(auth)` – authentication routes (register + login powered by NextAuth)
- `app/(dashboard)` – dashboard pages for inventory, suppliers, orders, locations
- `app/api` – API route handlers (e.g. `api/health`)
- `components/` – shared UI primitives
- `lib/` – Prisma client, auth helpers, utilities
- `prisma/` – Prisma schema & migrations
- `types/` – shared TypeScript definitions

### Prisma Commands

- `npm run prisma:generate` – regenerate Prisma client
- `npm run db:push` – sync schema changes (development)
- `npm run db:migrate` – create a migration during development
- `npm run db:studio` – open Prisma Studio for quick data inspection

### Production Hardening

This application includes several production-ready features for security, reliability, and maintainability:

#### Rate Limiting

Rate limiting protects sensitive endpoints from abuse:
- **Login attempts**: 5 attempts per 15 minutes per email
- **Password reset requests**: 3 requests per hour per IP/email
- **Invite acceptance**: 10 attempts per hour per token/IP

**Implementation**: The rate limiter automatically uses Redis (when `REDIS_URL` is set) for distributed rate limiting across multiple instances, or falls back to an in-memory store for single-instance deployments and local development.

#### Error Tracking (Sentry)

Sentry integration captures and reports errors in both client and server contexts:
- Configure `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to enable error tracking
- Safe initialization: The app runs normally when Sentry is not configured (ideal for local development)
- Error boundaries capture React errors and provide user-friendly fallback UIs
- Source maps are automatically uploaded in production builds (when `SENTRY_AUTH_TOKEN` is set)

#### Continuous Integration (CI/CD)

A GitHub Actions workflow (`.github/workflows/ci.yml`) automatically runs on all pull requests and pushes to `main`:
- Lints code with ESLint
- Builds the application to catch type errors and build issues
- Fails the build if any errors are detected

**Best Practice**: Ensure all CI checks pass before merging PRs or deploying to production.

### Next Steps

- Add automated tests (Vitest/Playwright)
- Set up staging and production environments
- Configure monitoring and alerting dashboards
