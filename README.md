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

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```
   
   **The application uses strict environment validation with Zod** and will fail-fast at startup if any required variable is missing or invalid. This ensures configuration errors are caught early with clear, actionable error messages.
   
   **Required (all environments):**
   - `DATABASE_URL` – PostgreSQL connection string (must start with `postgres://` or `postgresql://`)
   - `NEXTAUTH_SECRET` – Random secret for NextAuth, minimum 32 characters (generate with `openssl rand -base64 32`)
   - `CSRF_SECRET` – Random secret for CSRF token signing, minimum 32 characters (generate with `openssl rand -base64 32`)

   **Auto-defaults in development:**
   - `NEXTAUTH_URL` – Defaults to `http://localhost:3000` in development (HTTPS required in production)
   - `NEXT_PUBLIC_APP_URL` – Defaults to `http://localhost:3000` in development (HTTPS required in production)

   **Required in production only:**
   - `RESEND_API_KEY` – API key from [Resend](https://resend.com) for email functionality (optional in dev, logs to console)
   - `REDIS_URL` – Redis connection URL for distributed rate limiting (optional in dev, uses in-memory fallback)

   **Optional (all environments):**
   - `SENTRY_DSN` – Sentry DSN for server-side error tracking
   - `NEXT_PUBLIC_SENTRY_DSN` – Sentry DSN for client-side error tracking
   - `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` – For Sentry source map uploads
   
   See [`.env.example`](.env.example) for detailed documentation on each variable.

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

#### Environment Variable Validation

The application uses **strict, fail-fast environment variable validation** with Zod to catch configuration errors at startup before the app can serve requests.

**Key Features:**
- **Type-safe access**: All env vars are accessed via a typed `env` object from `lib/env.ts` instead of `process.env`
- **Fail-fast validation**: Invalid or missing required variables cause immediate startup failure with clear error messages
- **Production vs development validation**: Different requirements based on `NODE_ENV`
- **Automatic defaults**: Development URLs default to `http://localhost:3000`
- **Strict format validation**: 
  - Database URLs must start with `postgres://` or `postgresql://`
  - Secrets must be at least 32 characters
  - Production URLs must use HTTPS
  - Optional variables are validated if present

**Example error output:**
```
❌ Invalid environment variables:

  DATABASE_URL: DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)
  NEXTAUTH_SECRET: NEXTAUTH_SECRET must be at least 32 characters for security. Generate with: openssl rand -base64 32
  NEXT_PUBLIC_APP_URL: NEXT_PUBLIC_APP_URL must use HTTPS in production

💡 Fix these issues in your .env.local file or environment configuration.
   See .env.example for a complete list of required variables.
```

**Usage in code:**
```typescript
// ❌ Don't use process.env directly
const secret = process.env.NEXTAUTH_SECRET;

// ✅ Use the typed env module
import { env } from '@/lib/env';
const secret = env.NEXTAUTH_SECRET; // Type-safe and validated
```

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

All server actions that mutate data are protected with CSRF tokens to prevent cross-site request forgery attacks.

**Adding CSRF Protection to New Server Actions:**

For any server action that creates, updates, or deletes data, add CSRF verification at the start:

```typescript
'use server';

import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';

export async function createItemAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  
  // ... rest of your action code
}
```

**Client-Side Usage:**

When calling server actions from client components, the CSRF token is automatically included in the request headers by Next.js when using the standard form action pattern:

```typescript
'use client';

import { useFormState } from 'react-dom';
import { createItemAction } from './actions';

export function MyForm() {
  const [state, formAction] = useFormState(createItemAction, null);
  
  return (
    <form action={formAction}>
      {/* form fields */}
      <button type="submit">Submit</button>
    </form>
  );
}
```

For programmatic action calls outside of forms, ensure the `x-csrf-token` header is set with the token value from the `__Host-csrf` cookie. The CSRF token is automatically available in cookies after middleware sets it on the first request.

**Read-Only Actions:**

Server actions that only fetch data (no mutations) do NOT require CSRF protection and should not call `verifyCsrfFromHeaders()`.

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

#### Error Handling and Logging

The application implements a global error handler for all API routes, providing consistent error responses, correlation ID tracking, and structured logging.

**Features:**

- **Consistent Error Format**: All errors return `{ error: { code, message } }` with optional `details` field
- **Correlation IDs**: Every request/response includes an `X-Request-Id` header for distributed tracing
- **Structured Logging**: Uses Pino for JSON-formatted logs with correlation IDs
- **Domain Error Mapping**: Business logic errors are mapped to appropriate HTTP status codes
- **Production Safety**: Internal error details and stack traces are hidden in production

**Using Error Handling in API Routes:**

All new API routes should use the composed `apiHandler` or `apiHandlerContext` wrappers:

```typescript
import { apiHandler } from '@/lib/api-handler';
import { NextResponse } from 'next/server';
import { NotFoundError, ValidationError } from '@/src/domain/errors';

// Simple route
export const GET = apiHandler(async (request: Request) => {
  const item = await findItem(id);
  if (!item) throw new NotFoundError('Item', id);
  
  return NextResponse.json(item);
});

// Route with dynamic parameters
import { apiHandlerContext } from '@/lib/api-handler';

export const PATCH = apiHandlerContext(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const item = await updateItem(id);
    return NextResponse.json(item);
  }
);
```

The `apiHandler` and `apiHandlerContext` wrappers automatically provide:
- CSRF protection for mutating requests (POST, PUT, PATCH, DELETE)
- Error handling with consistent response format
- Correlation ID generation and header attachment
- Structured error logging

**Domain Errors:**

Throw appropriate domain errors for business logic violations. These are automatically mapped to HTTP responses:

```typescript
import {
  NotFoundError,        // 404
  UnauthorizedError,    // 401
  ForbiddenError,       // 403
  ValidationError,      // 422
  ConflictError,        // 409
  RateLimitError,       // 429
} from '@/src/domain/errors';

// Example: Not found
throw new NotFoundError('User', userId);
// Response: 404 { error: { code: 'NOT_FOUND', message: "User with ID 'xyz' not found" } }

// Example: Validation with details
throw new ValidationError('Invalid input', {
  email: ['Invalid email format'],
  password: ['Password too short']
});
// Response: 422 { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: {...} } }

// Example: Rate limiting
throw new RateLimitError('Too many requests', {
  limit: 10,
  remaining: 0,
  reset: 1234567890
});
// Response: 429 with X-RateLimit-* headers
```

**Client-Side Error Handling:**

Parse error responses consistently:

```typescript
const response = await fetchWithCsrf('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Item' }),
});

if (!response.ok) {
  const errorData = await response.json();
  console.error('Error:', errorData.error.code, errorData.error.message);
  
  // Handle validation errors
  if (errorData.error.code === 'VALIDATION_ERROR' && errorData.error.details) {
    // Display field-specific errors
    console.log('Validation errors:', errorData.error.details);
  }
}
```

**Correlation IDs:**

Every API response includes an `X-Request-Id` header for tracing:

```typescript
const response = await fetch('/api/items');
const correlationId = response.headers.get('X-Request-Id');
console.log('Request ID:', correlationId);
```

You can also provide your own correlation ID:

```typescript
const response = await fetch('/api/items', {
  headers: {
    'X-Request-ID': 'my-custom-correlation-id',
  },
});
```

**Structured Logging:**

The application uses Pino for structured logging. All logs include correlation IDs:

```typescript
import logger from '@/lib/logger';

// In your code
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, orderId }, 'Failed to process order');

// Logs are automatically enriched with correlation IDs in API routes
```

**Environment Configuration:**

- **Development**: Logs are pretty-printed and colorized for readability
- **Production**: Logs are JSON-formatted for log aggregation systems (ELK, Datadog, etc.)

Control log level with the `LOG_LEVEL` environment variable (defaults to `debug` in dev, `info` in prod):

```bash
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal
```

**Error Response Examples:**

```json
// Domain error
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Item with ID '123' not found"
  }
}

// Validation error with details
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "email": ["Valid email required"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}

// Unexpected error (production)
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Testing Error Handling:**

The test suite includes comprehensive error handler tests:

```bash
npm test
```

Tests cover:
- Happy path responses with correlation IDs
- Domain error mapping to correct HTTP status codes
- Validation errors with details
- Rate limit errors with headers
- Unexpected errors return generic 500
- No stack traces leak in production
- Correlation ID generation and header propagation

### Next Steps

- Set up staging and production environments
- Configure monitoring and alerting dashboards
- Add E2E tests with Playwright
