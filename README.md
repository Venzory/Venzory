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
   - `CSRF_SECRET` – Random secret for CSRF token signing (generate with `openssl rand -base64 32`)

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

#### Security Headers & Content Security Policy (CSP)

The application implements comprehensive security headers through Next.js middleware to protect against common web vulnerabilities. **Headers are applied to both page routes and API routes** for complete protection.

**Security Headers Applied:**

- **X-Frame-Options: DENY** – Prevents clickjacking attacks by disallowing iframe embedding
- **X-Content-Type-Options: nosniff** – Prevents MIME type sniffing attacks
- **Referrer-Policy: strict-origin-when-cross-origin** – Controls referrer information leakage
- **Strict-Transport-Security** (production only) – Forces HTTPS connections with `max-age=31536000; includeSubDomains`
- **Permissions-Policy: camera=(), microphone=(), geolocation=()** – Disables sensitive browser features
- **Content-Security-Policy** – Comprehensive XSS protection with nonce-based script/style execution

**Content Security Policy (CSP):**

The app uses a strict CSP policy with cryptographic nonces for inline scripts and styles:

```
default-src 'self';
script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic' 'unsafe-inline';
style-src 'self' 'nonce-{RANDOM}' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Key Features:**
- Headers applied to **both pages and API routes** – No endpoint is unprotected
- Uses `strict-dynamic` to allow scripts loaded by trusted scripts (modern CSP Level 3)
- Nonces are cryptographically generated per-request (128 bits of entropy)
- Fail-fast: Build fails if CSP cannot be generated (critical security requirement)
- `unsafe-inline` in **script-src**: Safe fallback for older browsers (ignored by modern browsers with `strict-dynamic`)
- `unsafe-inline` in **style-src**: Required for React inline styles (e.g., `style={{ width: '50%' }}`). Documented with TODO to refactor to CSS variables

**Modifying CSP for New External Resources:**

If you need to add external domains (e.g., CDNs, analytics), edit `lib/csp.ts`:

1. Locate the `CSP_DIRECTIVES` object
2. Add the domain to the appropriate directive array
3. Run tests to ensure CSP is still valid: `npm test`
4. Verify in browser dev tools (see below)

**Example** - Adding Google Fonts:
```typescript
'font-src': [
  "'self'",
  'data:',
  'https://fonts.gstatic.com',  // Add this
],
'style-src': [
  "'self'",
  "'nonce-{NONCE}'",
  "'unsafe-inline'",
  'https://fonts.googleapis.com',  // Add this
],
```

**Verifying Headers in Browser Dev Tools:**

1. Start the development server: `npm run dev`
2. Open Chrome/Edge DevTools (F12)
3. Navigate to **Network** tab
4. Reload the page
5. Click on any request (page route like `/login` or API route like `/api/health`)
6. Select **Headers** tab
7. Scroll to **Response Headers**
8. Verify the following headers are present:
   - `x-frame-options: DENY`
   - `x-content-type-options: nosniff`
   - `referrer-policy: strict-origin-when-cross-origin`
   - `permissions-policy: camera=(), microphone=(), geolocation=()`
   - `content-security-policy: default-src 'self'; ...`
   - `strict-transport-security` (production only)
   
**Note:** The nonce is embedded in the CSP header itself (e.g., `'nonce-abc123'` in `script-src`). We do NOT expose it as a separate `x-nonce` header for security reasons.

**Testing:**

Run the comprehensive security header test suite:
```bash
npm test
```

This runs 60+ tests covering:
- All security headers are present on both pages and API routes
- CSP contains all required directives
- Nonce generation and validation
- Environment-specific behavior (HSTS in prod only)
- Fail-fast validation (build fails if CSP cannot be generated)
- No unnecessary exposure of nonces via custom headers

#### CSRF Protection

The application implements comprehensive Cross-Site Request Forgery (CSRF) protection using a **double-submit cookie pattern** with HMAC-signed tokens. All state-changing API routes (POST, PUT, PATCH, DELETE) require valid CSRF tokens.

**What is CSRF?**

Cross-Site Request Forgery (CSRF) is an attack where a malicious website tricks a user's browser into making unwanted requests to your application while the user is authenticated. CSRF protection ensures that requests originate from your application and not from a malicious third-party site.

**How It Works:**

1. **Token Generation**: Middleware automatically generates a cryptographically secure CSRF token (32 bytes) and sets it in a cookie (`__Host-csrf`) with each request
2. **Token Signing**: Tokens are HMAC-signed using SHA-256 to prevent tampering
3. **Cookie Attributes**: `HttpOnly`, `SameSite=Lax`, `Secure` (production), `Path=/`, `Max-Age=3600` (1 hour)
4. **Verification**: API routes verify that the token in the cookie matches the token sent in the `X-CSRF-Token` header

**Environment Variable (Required):**

```bash
# Generate with: openssl rand -base64 32
CSRF_SECRET=your-secret-key-here
```

Add this to your `.env.local` file. The secret is used to sign CSRF tokens and must be kept private.

**Using CSRF Protection in Client Code:**

For client-side fetch requests to API routes, use the `fetchWithCsrf` helper:

```typescript
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

// Automatically includes CSRF token for POST/PUT/PATCH/DELETE
const response = await fetchWithCsrf('/api/invites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', role: 'STAFF' }),
});

// GET requests work normally (no CSRF token needed)
const data = await fetchWithCsrf('/api/notifications').then(r => r.json());
```

The helper automatically:
- Extracts the CSRF token from the `__Host-csrf` cookie
- Adds the `X-CSRF-Token` header to mutating requests
- Falls back to standard fetch for safe methods (GET, HEAD, OPTIONS)

**Adding CSRF Protection to New API Routes:**

Wrap your API route handlers with `withCsrfProtection`:

```typescript
import { withCsrfProtection } from '@/lib/api-handler';
import { NextResponse } from 'next/server';

// Simple route
export const POST = withCsrfProtection(async (request: Request) => {
  const body = await request.json();
  // Your handler code here
  return NextResponse.json({ success: true });
});

// Route with dynamic parameters
import { withCsrfProtectionContext } from '@/lib/api-handler';

export const PATCH = withCsrfProtectionContext(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { id } = params;
    // Your handler code here
    return NextResponse.json({ success: true });
  }
);
```

CSRF verification is automatically applied to POST, PUT, PATCH, and DELETE methods. GET, HEAD, and OPTIONS requests skip verification.

**Bypass List (Machine-to-Machine Endpoints):**

The following endpoints bypass CSRF verification:
- `/api/auth/*` - NextAuth internal callbacks
- `/api/health` - Health check for monitoring systems

To explicitly bypass CSRF for a specific endpoint (use with caution):

```typescript
export const POST = withCsrfProtection(handler, { bypassCsrf: true });
```

**Server Actions:**

Next.js server actions already have built-in CSRF protection via:
- The `Next-Action` header requirement (automatically added by Next.js)
- Origin header validation
- POST-only restriction

No additional CSRF protection is needed for standard form-based server actions. The utilities in `lib/server-action-csrf.ts` are available for programmatic action calls if needed, but are not required for typical use cases.

**Testing CSRF Protection:**

The test suite includes comprehensive CSRF tests:

```bash
npm test
```

Tests cover:
- Token generation, signing, and verification
- Cookie parsing and extraction
- API route protection (valid/invalid/missing tokens)
- Middleware cookie setting and rotation
- Bypass list functionality
- Security properties (timing-safe comparison, signature validation)

**Troubleshooting:**

If you receive `403 Invalid request` errors:
1. Ensure `CSRF_SECRET` is set in your environment variables
2. Verify you're using `fetchWithCsrf` for mutating API requests
3. Check that the `__Host-csrf` cookie is being set (inspect in browser DevTools → Application → Cookies)
4. Verify the `X-CSRF-Token` header is included in your request (Network tab → Request Headers)

**Security Considerations:**

- Token rotation: Tokens expire after 1 hour and are automatically rotated
- Cookie security: `__Host-` prefix requires Secure, Path=/, and no Domain attribute
- HMAC signing: Prevents token forgery and tampering
- Timing-safe comparison: Prevents timing attacks during token verification
- SameSite=Lax: Provides CSRF protection while allowing normal navigation

### Next Steps

- Set up staging and production environments
- Configure monitoring and alerting dashboards
- Add E2E tests with Playwright
