# Senior Backend Engineer Handover Document

**Project:** Venzory  
**Date:** November 23, 2025  
**Purpose:** Production readiness finalization  
**Audience:** Senior Backend Engineer

---

## 1. Project Summary

### What Venzory Is

Venzory is a **multi-tenant SaaS platform** for medical inventory management targeting GP practices and other medical clinics. The application provides:

- **Item & Supplier Management:** Practice-specific catalogs linked to global supplier data
- **Order Lifecycle:** Draft → Sent → Receiving → Fulfilled with multi-supplier support
- **Inventory Tracking:** Location-based inventory with stock adjustments, transfers, and reorder points
- **Goods Receiving:** Integration with orders, partial receiving, barcode scanning
- **Stock Counting:** Session-based counting with concurrency detection and admin override
- **Multi-Tenancy:** Practice-based isolation with role-based access control (ADMIN/STAFF/VIEWER)

### Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM 5.20
- **Authentication:** NextAuth v5 (JWT strategy, 30-day sessions)
- **Cache/Rate Limiting:** Redis (ioredis client)
- **Email:** Resend API
- **Logging:** Pino (structured JSON logs)
- **Testing:** Vitest (unit + integration tests)
- **Error Tracking:** Sentry (production only)

### Key Architecture Patterns

#### **Layered Architecture (Go-Ready Pattern)**

```
API Layer (actions.ts, route.ts)
    ↓
Service Layer (src/services/*)
    ↓
Repository Layer (src/repositories/*)
    ↓
Database (PostgreSQL via Prisma)
```

**Design Goals:**
- Clear separation of concerns
- Framework-independent business logic
- Easy migration to Go microservices
- Testable in isolation

#### **RequestContext Pattern**

All service methods receive a `RequestContext` object containing:
```typescript
interface RequestContext {
  userId: string;
  userEmail: string;
  practiceId: string;        // Tenant identifier
  role: PracticeRole;        // ADMIN | STAFF | VIEWER
  memberships: ContextPracticeMembership[];
  timestamp: Date;
  requestId?: string;        // Correlation ID
}
```

Built via `buildRequestContext()` from NextAuth session. Mirrors Go's `context.Context` pattern.

#### **Repository Pattern**

All data access goes through repositories that:
- Extend `BaseRepository` class
- Automatically scope queries to `practiceId` via `scopeToPractice()` helper
- Support transaction passing via `{ tx }` options
- Enforce tenant isolation at data access layer

Example:
```typescript
class InventoryRepository extends BaseRepository {
  async findItems(practiceId: string, filters?: InventoryFilters, options?: FindOptions) {
    const client = this.getClient(options?.tx);
    return client.item.findMany({
      where: this.scopeToPracticeWith(practiceId, filters),
      // ...
    });
  }
}
```

#### **Service Layer Patterns**

Services contain business logic and:
- Depend on repository interfaces (no direct Prisma imports)
- Enforce authorization via `requireRole(ctx, 'STAFF')`
- Manage transactions via `withTransaction()` wrapper
- Log all state changes via `AuditService`
- Throw domain errors (`ValidationError`, `NotFoundError`, etc.)

#### **RBAC Enforcement**

Three-tier role system:
- **VIEWER:** Read-only access to most resources
- **STAFF:** Can create/edit orders, receive goods, adjust inventory
- **ADMIN:** Full access including user management, dangerous operations

Enforced at:
1. Middleware level (route access)
2. Service level (operation permissions via `requireRole()`)
3. UI level (conditional rendering)

#### **Tenant Isolation**

Multi-tenancy via row-level filtering:
- All tenant-scoped tables have `practiceId` column
- All queries include `WHERE practiceId = $1`
- Repositories automatically inject tenant scope
- Integration tests verify cross-tenant access prevention

#### **Transaction Management**

Atomic multi-step operations use `withTransaction()`:
```typescript
return withTransaction(async (tx) => {
  await repo1.create(data, { tx });
  await repo2.update(id, changes, { tx });
  await auditService.log(ctx, event, tx);
});
```

All repository methods accept optional `{ tx }` parameter.

#### **Audit Logging**

Centralized audit trail via `AuditService`:
- Logs all CREATE, UPDATE, DELETE, SEND, CONFIRM operations
- Stores: entity type, entity ID, action, changes (JSON), actor, timestamp
- Used for compliance, debugging, and user activity tracking

---

## 2. Current State

### ✅ What Works Reliably

#### **Core Flows (Production-Ready)**
- **Authentication:** NextAuth v5 with credentials + magic link providers
- **User Management:** Invite users, manage roles, last-admin protection
- **Practice Onboarding:** Guided setup flow with progress tracking
- **Items & Suppliers:** Practice catalog, supplier linking, pricing management
- **Orders:** Create, edit, send, delete draft orders (DRAFT → SENT status)
- **Receiving:** Goods receipts, partial receiving, order integration, barcode scanning
- **Inventory:** Location-based inventory, stock adjustments, transfers
- **Stock Counting:** Session-based counting with concurrency detection
- **Locations:** CRUD operations, hierarchy support, deletion safeguards

#### **Security (Production-Ready)**
- **CSRF Protection:** Double-submit cookie with HMAC signing, all mutations protected
- **Security Headers:** CSP with nonces, X-Frame-Options, HSTS (production), Permissions-Policy
- **Tenant Isolation:** Verified via integration tests, all queries scoped to `practiceId`
- **Rate Limiting:** Login (10/15min), password reset (3/hour), registration (5/hour)
- **Session Security:** JWT with HttpOnly cookies, SameSite=Lax, 30-day expiry

#### **Infrastructure**
- **Environment Validation:** Zod-based fail-fast validation on startup
- **Error Handling:** Domain errors mapped to HTTP status codes, correlation IDs on all responses
- **Structured Logging:** Pino with correlation ID propagation
- **Health Check:** Basic `/api/health` endpoint (Postgres only)

#### **Data Model**
- **Product Backbone:** `Product` (global) → `Item` (practice-specific) → `LocationInventory`
- **Supplier Hierarchy:** `GlobalSupplier` → `PracticeSupplier` → `PracticeSupplierItem` (pricing)
- **Order Flow:** Draft → Sent → Partially Received → Received with `GoodsReceipt` integration
- **Audit Trail:** All state changes logged to `AuditLog` table

### ⚠️ What Is Partially Implemented

#### **Order Email Sending**
- **Status:** Email delivery strategy pattern exists (`src/services/orders/delivery/`)
- **Gap:** Not wired up in `sendOrder()` action; email sending commented out
- **Code Location:** `src/services/orders/order-service.ts:398-420`
- **Impact:** Orders marked SENT but suppliers never notified

#### **Supplier Migration**
- **Status:** Dual model exists (legacy `Supplier` + new `GlobalSupplier`/`PracticeSupplier`)
- **Gap:** `OrderTemplateItem.supplierId` still references legacy with runtime mapping
- **Migration Field:** `migratedFromSupplierId` tracks migration but incomplete
- **Impact:** Complexity in template-based ordering, maintenance burden

#### **Rate Limiting**
- **Status:** Redis-based rate limiting implemented with in-memory fallback
- **Gap:** "Fail open" behavior in non-production (allows requests if Redis fails)
- **Code Location:** `lib/rate-limit.ts:119-145`
- **Impact:** Brute-force attacks possible if Redis unavailable in production

#### **Integration Tests**
- **Status:** ~60 tests written covering repositories, services, transactions
- **Gap:** Not run in CI due to flakiness; only 3 stable tests in CI suite
- **Code Location:** `vitest.ci.config.ts` (minimal test list)
- **Impact:** Regressions may slip through; manual testing burden

### ⏳ What Is Pending

- **Job Queue Infrastructure:** No async worker for email sending
- **Database Constraints:** Missing CHECK constraints for inventory quantities
- **CI/CD Pipeline:** No automated testing or deployment
- **Health Check Expansion:** Redis and Resend not monitored
- **Audit Log Retention:** No archival/cleanup policy (grows indefinitely)
- **E2E Tests:** No Playwright tests for critical user flows

---

## 3. Critical Work Required (Senior-Level Only)

### 🔴 Email Job Queue Implementation

**Objective:** Move email sending from synchronous request handler to async background worker.

**Current Problem:**
- `OrderService.sendOrder()` calls email delivery synchronously
- If Resend API is slow/down, request times out
- No retry mechanism for failed emails
- Order marked SENT but email may never deliver

**Required Implementation:**

#### **Technology Selection**
- **Recommended:** BullMQ (Redis-backed, TypeScript-native, production-proven)
- **Alternatives:** Inngest (serverless), Temporal (complex workflows)

#### **Worker Architecture**
```typescript
// workers/email-worker.ts
import { Worker, Job } from 'bullmq';

interface EmailJobData {
  orderId: string;
  practiceId: string;
  recipientEmail: string;
  orderData: OrderEmailData;
}

const emailWorker = new Worker('email-queue', async (job: Job<EmailJobData>) => {
  const { orderId, recipientEmail, orderData } = job.data;
  
  // Send email via Resend
  const result = await resend.emails.send({
    from: 'orders@venzory.com',
    to: recipientEmail,
    subject: `Purchase Order #${orderId}`,
    html: renderOrderEmailTemplate(orderData),
  });
  
  // Update order with email sent timestamp
  await prisma.order.update({
    where: { id: orderId },
    data: { emailSentAt: new Date() }
  });
  
  return result;
}, {
  connection: redisConnection,
  concurrency: 5,
});
```

#### **Retry Strategy**
- **Initial retry:** 1 minute
- **Exponential backoff:** 2^attempt minutes (max 60 min)
- **Max attempts:** 5
- **Dead-letter queue:** After 5 failures, move to `email-dlq` for manual review

#### **Integration Points**
1. **OrderService:** Queue job instead of sending directly
   ```typescript
   // In sendOrder() method
   await emailQueue.add('send-order-email', {
     orderId,
     practiceId: ctx.practiceId,
     recipientEmail: supplier.contactEmail,
     orderData: transformOrderForEmail(order),
   });
   ```

2. **Monitoring:**
   - Track job completion rate
   - Alert on DLQ growth
   - Dashboard for failed jobs

3. **Worker Process:**
   - Separate Node process (`npm run worker:email`)
   - Graceful shutdown on SIGTERM
   - Health check endpoint for worker

#### **Deployment Considerations**
- Worker should scale independently from web servers
- Redis connection pool sizing (10-20 connections recommended)
- Worker logs should include correlation IDs from original request
- Consider rate limiting to Resend API (batch sending if needed)

---

### 🔴 Rate Limiting Hardening

**Objective:** Enforce fail-closed rate limiting in production to prevent brute-force attacks.

**Current Problem:**
- Redis failure causes rate limiter to "fail open" (allow all requests)
- In-memory fallback doesn't work in serverless/multi-instance environments
- Critical auth endpoints vulnerable if Redis is down

**Code Locations:**
- `lib/rate-limit.ts:119-145` (fail-open catch block)
- `lib/rate-limit.ts:256-279` (production enforcement)
- `lib/rate-limit.ts:334-363` (pre-configured limiters)

**Required Changes:**

#### **1. Enforce Fail-Closed for Auth Endpoints**

Current behavior:
```typescript
catch (error) {
  logger.error(..., 'Redis rate limiter error - failing open');
  return { success: true, ... }; // ❌ ALLOWS REQUEST
}
```

Required behavior:
```typescript
catch (error) {
  if (this.config.failClosed) {
    logger.error(..., 'Redis rate limiter error - failing closed');
    return { success: false, ... }; // ✅ BLOCKS REQUEST
  }
  // Only fail open for non-critical endpoints
  logger.warn(..., 'Redis rate limiter error - failing open');
  return { success: true, ... };
}
```

Update all auth-related limiters:
```typescript
export const loginRateLimiter = createRateLimiter({
  id: 'login',
  limit: 10,
  windowMs: 15 * 60 * 1000,
  failClosed: true, // ✅ Already set
});

export const passwordResetRateLimiter = createRateLimiter({
  id: 'password-reset',
  limit: 3,
  windowMs: 60 * 60 * 1000,
  failClosed: true, // ✅ Already set
});
```

#### **2. Production Redis Enforcement**

Verify production startup fails if Redis unavailable:
```typescript
if (isProduction && !isEdgeRuntime) {
  if (!redisUrl || !Redis) {
    throw new Error('Redis is required for rate limiting in production');
  }
  // Test connection on startup
  const testClient = new Redis(redisUrl);
  await testClient.ping();
  testClient.disconnect();
}
```

#### **3. Edge Runtime Compatibility**

**Issue:** ioredis doesn't work in Edge Runtime (Vercel Edge Functions).

**Options:**
- **A. Use @upstash/ratelimit** (Edge-compatible Redis client)
- **B. Disable Edge Runtime for rate-limited routes** (use Node.js runtime)
- **C. Accept in-memory fallback with warning logs**

**Recommended:** Option A (Upstash) for distributed rate limiting in Edge.

Implementation:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// For Edge Runtime
const edgeRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "15 m"),
});
```

#### **4. Health Check Integration**

Add Redis connectivity check to `/api/health`:
```typescript
// Verify Redis is accessible
try {
  await redis.ping();
  redisStatus = 'healthy';
} catch (error) {
  redisStatus = 'unhealthy';
  overallHealth = 'degraded';
}
```

---

### 🔴 Supplier Migration Completion

**Objective:** Remove legacy `Supplier` model and complete transition to `GlobalSupplier` + `PracticeSupplier` architecture.

**Current State:**
- New model: `GlobalSupplier` (shared) → `PracticeSupplier` (practice-specific link)
- Legacy model: `Supplier` (deprecated but still referenced)
- Mapping field: `PracticeSupplier.migratedFromSupplierId` tracks migration

**Problem Areas:**
1. `OrderTemplateItem.supplierId` references legacy `Supplier`
2. Runtime mapping logic in multiple services
3. UI shows mix of legacy and new supplier data

**Code Locations:**
- `prisma/schema.prisma:200-228` (PracticeSupplier model)
- `src/services/orders/order-service.ts:1166-1183` (template supplier mapping)
- `app/(dashboard)/orders/templates/[id]/page.tsx` (template UI)

**Migration Strategy:**

#### **Phase 1: Schema Changes**

Add `practiceSupplierId` to `OrderTemplateItem`:
```prisma
model OrderTemplateItem {
  id                 String   @id @default(cuid())
  templateId         String
  itemId             String
  defaultQuantity    Int
  practiceSupplierId String?  // ✅ NEW FIELD
  
  // Deprecated (remove after migration)
  supplierId         String?  // ❌ LEGACY
  
  template         OrderTemplate     @relation(...)
  item             Item              @relation(...)
  practiceSupplier PracticeSupplier? @relation(...)
  
  @@unique([templateId, itemId])
  @@index([practiceSupplierId])
}
```

Migration SQL:
```sql
-- Step 1: Add new column (nullable)
ALTER TABLE "OrderTemplateItem" 
ADD COLUMN "practiceSupplierId" TEXT;

-- Step 2: Create index
CREATE INDEX "OrderTemplateItem_practiceSupplierId_idx" 
ON "OrderTemplateItem"("practiceSupplierId");

-- Step 3: Add foreign key
ALTER TABLE "OrderTemplateItem" 
ADD CONSTRAINT "OrderTemplateItem_practiceSupplierId_fkey" 
FOREIGN KEY ("practiceSupplierId") 
REFERENCES "PracticeSupplier"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;
```

#### **Phase 2: Data Backfill**

Create backfill script (`scripts/backfill-template-practice-suppliers.ts`):
```typescript
// For each OrderTemplateItem with legacy supplierId:
// 1. Find PracticeSupplier via migratedFromSupplierId
// 2. Update OrderTemplateItem.practiceSupplierId
// 3. Log any unmapped items for manual review

const items = await prisma.orderTemplateItem.findMany({
  where: {
    supplierId: { not: null },
    practiceSupplierId: null,
  },
  include: { template: true, item: true },
});

for (const item of items) {
  const practiceSupplier = await prisma.practiceSupplier.findFirst({
    where: {
      practiceId: item.template.practiceId,
      migratedFromSupplierId: item.supplierId,
    },
  });
  
  if (practiceSupplier) {
    await prisma.orderTemplateItem.update({
      where: { id: item.id },
      data: { practiceSupplierId: practiceSupplier.id },
    });
  } else {
    // Log for manual review
    logger.warn({ itemId: item.id, supplierId: item.supplierId }, 
      'No practice supplier mapping found');
  }
}
```

#### **Phase 3: Code Updates**

Remove runtime mapping logic from services:
```typescript
// BEFORE (complex mapping)
const practiceSupplierId = templateItem.practiceSupplierId 
  || templateItem.item?.defaultPracticeSupplierId 
  || null;

// AFTER (direct reference)
const practiceSupplierId = templateItem.practiceSupplierId;
```

Update template CRUD to use `practiceSupplierId`:
- Template creation: Use `practiceSupplierId` directly
- Template editing: Update `practiceSupplierId` field
- Template display: Show practice supplier name

#### **Phase 4: Legacy Cleanup**

After verifying all templates migrated:
```sql
-- Step 1: Verify no orphaned references
SELECT COUNT(*) FROM "OrderTemplateItem" 
WHERE "supplierId" IS NOT NULL 
AND "practiceSupplierId" IS NULL;
-- Must return 0

-- Step 2: Drop legacy column
ALTER TABLE "OrderTemplateItem" 
DROP COLUMN "supplierId";

-- Step 3: Drop legacy Supplier table (if safe)
-- Verify no other references first
DROP TABLE "Supplier";
```

#### **Data Integrity Checks**

Before production deployment:
1. Verify all `OrderTemplateItem` have `practiceSupplierId` or are supplier-agnostic
2. Verify all `PracticeSupplier` have valid `globalSupplierId`
3. Verify no orphaned `migratedFromSupplierId` references
4. Test template-based ordering with migrated data

---

### 🔴 Database Constraint Hardening

**Objective:** Add database-level constraints to enforce business invariants and prevent edge-case data corruption.

**Current State:**
- Business rules enforced in service layer only
- No database-level validation for critical invariants
- Risk of constraint violations in high-concurrency scenarios

**Required Constraints:**

#### **1. Non-Negative Inventory Quantities**

**Problem:** Service validates `quantity >= 0` but no DB constraint.

**Risk:** Race conditions could produce negative inventory.

**Migration:**
```sql
-- Step 1: Fix any existing negative quantities
UPDATE "LocationInventory" 
SET quantity = 0 
WHERE quantity < 0;

-- Step 2: Add constraint
ALTER TABLE "LocationInventory" 
ADD CONSTRAINT "LocationInventory_quantity_check" 
CHECK (quantity >= 0);
```

**Zero-Downtime Strategy:**
- Run Step 1 during low-traffic window
- Verify no rows updated (should be 0 if services working correctly)
- Add constraint (fast operation, no table rewrite)
- Monitor for constraint violations post-deployment

#### **2. Stock Adjustment Validation**

**Problem:** Stock adjustments should never be zero (no-op).

**Migration:**
```sql
ALTER TABLE "StockAdjustment" 
ADD CONSTRAINT "StockAdjustment_quantity_nonzero" 
CHECK (quantity != 0);
```

#### **3. Transfer Validation**

**Problem:** Transfers to same location should be blocked.

**Migration:**
```sql
ALTER TABLE "InventoryTransfer" 
ADD CONSTRAINT "InventoryTransfer_different_locations" 
CHECK ("fromLocationId" != "toLocationId");
```

#### **4. Order Item Positive Quantities**

**Migration:**
```sql
ALTER TABLE "OrderItem" 
ADD CONSTRAINT "OrderItem_quantity_positive" 
CHECK (quantity > 0);
```

#### **Testing Strategy**

Before production:
1. Run constraints on staging with production-like data volume
2. Test constraint violations are handled gracefully (proper error messages)
3. Verify service-layer validations catch issues before DB constraint
4. Add integration tests that verify constraints are enforced

---

### 🔴 CI/CD Pipeline Setup

**Objective:** Automated testing and safe deployment pipeline for production releases.

**Requirements:**

#### **GitHub Actions Workflow**

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: venzory_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npm run prisma:generate
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/venzory_test
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Security tests
        run: npm run test:ci
      
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/venzory_test
          REDIS_URL: redis://localhost:6379
          NEXTAUTH_SECRET: test-secret-minimum-32-characters-long
          CSRF_SECRET: test-csrf-secret-minimum-32-characters
          NODE_ENV: test
```

#### **Test Stabilization Requirements**

Before enabling full test suite in CI:
1. **Fix integration test flakiness:**
   - Proper database cleanup between tests
   - Isolated test databases (parallel execution)
   - No shared state between tests
   - Deterministic test data generation

2. **Add missing integration tests:**
   - Tenant isolation (cross-practice access attempts)
   - Transaction rollback scenarios
   - Concurrent updates (race conditions)
   - Rate limiting enforcement

3. **Separate test suites:**
   - Unit tests: Fast, no DB (run always)
   - Integration tests: DB required (run in CI)
   - E2E tests: Full stack (run on staging)

#### **Deployment Strategy**

**Recommended:** Blue-green deployment for zero downtime.

**Steps:**
1. Run migrations on production DB (forward-only, backward-compatible)
2. Deploy new version to "green" environment
3. Health check verification
4. Route 10% traffic to green (canary)
5. Monitor errors for 5 minutes
6. Full cutover if healthy
7. Keep blue environment for 24h (rollback safety)

#### **Environment Validation**

Pre-deployment checks:
```bash
# Verify all required env vars present
npm run env:validate

# Verify database migrations applied
npx prisma migrate status

# Verify Redis connectivity
npm run health:redis

# Verify Resend API key valid
npm run health:resend
```

#### **Health Check Integration**

Load balancer should poll `/api/health` every 10 seconds:
- **Healthy (200):** Database + Redis responding
- **Degraded (503):** Database healthy but Redis down
- **Unhealthy (503):** Database unreachable

#### **Secrets Management**

Use GitHub Secrets for:
- `DATABASE_URL` (production)
- `REDIS_URL`
- `NEXTAUTH_SECRET`
- `CSRF_SECRET`
- `RESEND_API_KEY`
- `SENTRY_AUTH_TOKEN` (source map uploads)

---

## 4. Important But Not Critical (Senior Recommended)

### Integration Test Stabilization

**Current Issue:**
- ~60 tests written but only 3 run in CI
- Flaky tests due to shared database state
- No parallel execution support

**Recommended Fixes:**
- Implement per-test database isolation (separate schemas or databases)
- Add proper cleanup in `afterEach()` hooks
- Use test transactions with rollback
- Fix timing-dependent assertions
- Add retry logic for Redis/network operations

**Estimated Effort:** 8-12 hours

---

### Health Check Expansion

**Current State:** `/api/health` only checks PostgreSQL.

**Recommended Additions:**

```typescript
export async function GET() {
  const checks = {
    postgres: await checkPostgres(),
    redis: await checkRedis(),
    resend: await checkResend(), // Optional
    disk: await checkDiskSpace(),
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const status = allHealthy ? 200 : 503;
  
  return NextResponse.json(checks, { status });
}
```

**Redis Check:**
```typescript
async function checkRedis() {
  try {
    await redis.ping();
    return { status: 'healthy', latency: '< 5ms' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

**Estimated Effort:** 2-4 hours

---

### CSP Inline Style Cleanup

**Current State:** `style-src` includes `'unsafe-inline'` for React inline styles.

**Impact:** Weakens XSS protection (though mitigated by nonces in modern browsers).

**Recommended Approach:**
1. Audit all `style={{ ... }}` usage in components
2. Convert to utility classes or CSS modules
3. Use CSS variables for dynamic values
4. Remove `'unsafe-inline'` from CSP
5. Test across browsers

**Estimated Effort:** 4-8 hours

---

### Audit Log Retention Policy

**Current Issue:** `AuditLog` table grows indefinitely (no cleanup).

**Recommended Solution:**

Create cron job (`/api/cron/cleanup-audit-logs`):
```typescript
// Archive logs older than 2 years
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 2);

// Option A: Delete (if legal/compliance allows)
await prisma.auditLog.deleteMany({
  where: { createdAt: { lt: cutoff } }
});

// Option B: Archive to S3/cold storage
const oldLogs = await prisma.auditLog.findMany({
  where: { createdAt: { lt: cutoff } }
});
await archiveToS3(oldLogs);
await prisma.auditLog.deleteMany({
  where: { createdAt: { lt: cutoff } }
});
```

**Considerations:**
- Check legal/compliance requirements (medical data may require 7-10 year retention)
- Run during low-traffic window
- Monitor query performance during cleanup
- Consider table partitioning for large datasets

**Estimated Effort:** 4-6 hours

---

## 5. Context & Notes

### Code Quality Strengths

#### **Architecture**
- **Clean layering:** API/Service/Repository separation is consistent throughout
- **No leaky abstractions:** Services never import Prisma directly
- **Testable design:** Dependency injection allows easy mocking
- **Future-proof:** Go migration path is clear and documented

#### **Security**
- **Defense in depth:** CSRF + CSP + tenant isolation + RBAC all enforced
- **No security theater:** Actual cryptographic protections (HMAC signing, nonces)
- **Well-tested:** 60+ security tests covering edge cases
- **Production-ready headers:** All OWASP recommendations implemented

#### **Documentation**
- **62 documents:** Well-organized in `docs/` folder
- **Clear status:** `CANONICAL_DOCS.md` marks current vs historical docs
- **Architecture guide:** Patterns explained with examples
- **Runbooks:** Operations procedures documented

### Pattern Consistency

#### **✅ Highly Consistent**
- Repository pattern usage (all data access goes through repos)
- RequestContext threading (all services receive `ctx`)
- Transaction wrapping (all multi-step ops use `withTransaction()`)
- Audit logging (all mutations logged)
- Error handling (domain errors used consistently)

#### **⚠️ Some Inconsistency**
- Logging: Mix of `console.error` and `logger.error()` (mostly in older actions)
- Validation: Some Zod schemas in actions, some in services
- Error messages: Some generic ("Invalid input"), some specific
- Test coverage: Core flows well-tested, edge cases less so

### Critical Assumptions

#### **Multi-Tenant Boundaries**

**Practice Isolation is Absolute:**
- Every tenant-scoped query MUST include `WHERE practiceId = ?`
- No "super-admin" role that bypasses tenant isolation
- Owner console (`/owner/*`) is separate from practice context

**Platform Owner Privilege:**
- Identified by email match to `PLATFORM_OWNER_EMAIL` env var
- Can view all practices but cannot impersonate practice users
- Access to `/owner/*` routes for diagnostics

**Active Practice Concept:**
- Users can belong to multiple practices (via `PracticeUser` junction table)
- Only one practice is "active" at a time (stored in JWT token)
- Switching practices requires re-authentication or practice switcher UI (not yet implemented)

#### **Order Workflow**

**Status Transitions:**
```
DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED
   ↓                                      ↓
CANCELLED ←─────────────────────────────┘
```

**Key Rules:**
- Only DRAFT orders can be edited/deleted
- SENT orders can receive goods via `GoodsReceipt`
- Partial receiving changes status to PARTIALLY_RECEIVED
- Final receipt changes status to RECEIVED
- Manual "close order" action also sets RECEIVED

**Email Sending (Pending):**
- Should trigger when DRAFT → SENT
- Failure should NOT block status change
- Retry via job queue

#### **Supplier Hierarchy**

**Two-Level Structure:**
```
GlobalSupplier (shared across all practices)
    ↓
PracticeSupplier (practice-specific link with account info)
    ↓
PracticeSupplierItem (pricing, SKU, lead time)
```

**Why Two Levels:**
- Practices often use same suppliers but different account numbers
- Allows supplier catalog updates without affecting all practices
- Supports practice-specific pricing negotiations

**Migration Complexity:**
- Legacy `Supplier` model still partially referenced
- `migratedFromSupplierId` field tracks migration
- Some UI shows mix of old/new models
- Templates still use legacy `supplierId` (needs cleanup)

#### **Inventory Model**

**Three-Level Structure:**
```
Product (global, GS1-verified if available)
    ↓
Item (practice catalog, practice-specific name/SKU)
    ↓
LocationInventory (quantity per location)
```

**Why Three Levels:**
- Supports multi-location practices (main clinic + satellite offices)
- Allows same product to have different names per practice (localization)
- Enables location-specific reorder points and max stock levels

**Stock Movements:**
- `StockAdjustment`: Manual corrections (counted inventory, found items, shrinkage)
- `InventoryTransfer`: Move stock between locations
- `GoodsReceipt`: Receiving goods from suppliers (increases inventory)
- `StockCountSession`: Periodic physical counts with variance detection

#### **Transaction Philosophy**

**When to Use Transactions:**
- Multi-table updates that must be atomic
- Order creation (order + items + audit log)
- Goods receiving (receipt + inventory updates + order status + audit log)
- Stock count completion (inventory adjustments + audit logs)

**When NOT to Use Transactions:**
- Single-table reads
- Idempotent operations
- Operations that call external APIs (email, webhooks)

**Nested Transactions:**
- Prisma doesn't support true nested transactions
- `withTransaction()` reuses parent transaction if called within transaction
- Services assume they may be called within or outside transaction context

### Performance Considerations

#### **N+1 Query Prevention**
- Most repositories use `include` to eager-load relations
- List views use pagination (default 50 items per page)
- Large tables (Items, Orders, AuditLog) have indexes on common filters

#### **Known Slow Queries**
- Order list with items and supplier info (3-4 joins)
- Dashboard KPIs (multiple aggregations across tables)
- Low-stock calculation (joins LocationInventory with reorder points)

**Optimization Opportunities:**
- Add Redis caching for product catalog (rarely changes)
- Materialize low-stock items in separate table (updated on inventory change)
- Add database-level indexes on `(practiceId, createdAt)` for time-series queries

#### **Database Indexes**

**Well-Indexed:**
- All `practiceId` columns (tenant filtering)
- Foreign keys (automatic in Prisma)
- `createdAt` on time-series tables (Orders, AuditLog)

**Missing Indexes:**
- Composite index on `(practiceId, status, createdAt)` for Order queries
- Full-text search indexes on Item.name, Product.name (if search becomes slow)

### Testing Philosophy

#### **Current Coverage**
- **Unit Tests:** Service logic, domain validators, utility functions
- **Integration Tests:** Repository methods, transaction rollback, tenant isolation
- **Security Tests:** CSRF, CSP, rate limiting, auth config
- **E2E Tests:** None (manual testing only)

#### **Test Database Strategy**
- Integration tests use real PostgreSQL database
- Tests run sequentially (no parallel execution yet)
- Database cleaned between tests via Prisma `deleteMany()`
- Some tests use transactions with rollback (faster)

#### **Flakiness Sources**
- Timing-dependent assertions (stock count concurrency)
- Shared Redis state (rate limiting tests)
- Insufficient cleanup between tests
- Non-deterministic test data generation

### Security Model

#### **Attack Surface**
- **Public endpoints:** `/api/auth/*`, `/api/health`, `/api/invites/accept`
- **Authenticated endpoints:** All other `/api/*` routes
- **Server actions:** All `actions.ts` files in `app/(dashboard)`
- **Static assets:** Public images, fonts (no user uploads yet)

#### **Trust Boundaries**
- **External input:** All request bodies, query params, headers validated
- **Database:** Trusted (no SQL injection via Prisma)
- **NextAuth:** Trusted (session token verification)
- **Redis:** Trusted (internal network only)
- **Resend API:** Untrusted (graceful degradation if fails)

#### **Sensitive Data**
- **User passwords:** bcrypt hashed (cost factor 10)
- **Session tokens:** JWT signed with NEXTAUTH_SECRET
- **CSRF tokens:** HMAC signed with CSRF_SECRET
- **Audit logs:** Store changes (JSON) but no sensitive data (passwords, tokens)

#### **Compliance Considerations**
- **GDPR:** User data deletion not implemented (future requirement)
- **HIPAA:** Audit logging supports compliance but medical data handling not verified
- **Data retention:** No automatic deletion policies (needs legal review)

---

## Next Steps for Senior Engineer

### Day 1: Onboarding
1. Read this document thoroughly
2. Clone repository and set up local development environment
3. Run application locally and explore UI flows
4. Review key code files:
   - `src/services/orders/order-service.ts` (business logic example)
   - `src/repositories/base/base-repository.ts` (data access pattern)
   - `lib/csrf.ts` (security implementation)
   - `proxy.ts` (middleware and route protection)

### Week 1: Critical Tasks
1. Implement BullMQ job queue for email delivery
2. Harden rate limiting (fail-closed enforcement)
3. Expand health checks (Redis + Resend)
4. Set up basic CI/CD pipeline (lint + typecheck + security tests)

### Week 2: Data & Infrastructure
1. Complete supplier migration (schema changes + backfill)
2. Add database constraints (inventory quantities)
3. Stabilize integration tests for CI
4. Document deployment procedures

### Week 3: Production Readiness
1. Load testing and performance tuning
2. Production deployment (staging first)
3. Monitoring and alerting setup
4. Knowledge transfer to solo founder

---

**Questions or clarifications needed?** Contact the solo founder or refer to:
- `docs/CANONICAL_DOCS.md` - Index of all current documentation
- `docs/architecture/ARCHITECTURE.md` - Detailed architecture guide
- `docs/operations/OPS_RUNBOOK.md` - Operations procedures
- `README.md` - Setup and getting started guide

