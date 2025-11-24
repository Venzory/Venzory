# Venzory MVP: Backend Architecture Audit Brief

**Project:** Multi-tenant inventory management for medical practices (GP clinics, medical offices)  
**Goal:** Prepare for pilot launch with 1-3 practices  
**Stack:** Next.js 16 + TypeScript + Prisma + PostgreSQL + NextAuth v5

---

## Architecture Pattern

```
API Layer (actions.ts, route.ts)
    ↓
Service Layer (src/services/*)
    ↓
Repository Layer (src/repositories/*)
    ↓
PostgreSQL
```

**Key Patterns:**
- **RequestContext:** All service methods receive `{ userId, practiceId, role, ... }` for tenant scoping
- **Repository Scoping:** `scopeToPractice(practiceId)` automatically filters all queries
- **Transaction Management:** `withTransaction()` wrapper for atomic multi-step operations
- **RBAC:** `requireRole(ctx, 'STAFF' | 'ADMIN')` enforced at service layer
- **Audit Logging:** All state changes logged via `AuditService`

---

## Your Focus: Code Review Only

**Audit the implementation of:**
1. Transaction boundaries (inventory, receiving, orders)
2. Tenant isolation at repository level
3. RBAC enforcement at service level
4. Data integrity rules vs database constraints
5. Concurrency safety (atomic operations)
6. Order/receiving workflow correctness
7. Authentication/session edge cases

**Implementation Task:** Order email sending (direct Resend API call, no job queue)

**NOT Your Responsibility:** UI testing, manual flow validation, end-to-end scenarios

---

## Critical Audit Areas

### **1. Transaction Boundaries & Atomicity**

**Verify:**
- All `LocationInventory.quantity` updates use `{ increment: delta }` (atomic)
- No read-modify-write patterns that could race
- Multi-step operations wrapped in `withTransaction()`
- Receipt confirmation includes: status update + inventory + order status + audit log

**Key Files:**
- `src/repositories/inventory/inventory-repository.ts`
- `src/services/receiving/receiving-service.ts:confirmReceipt()`
- `src/services/orders/order-service.ts:createOrder()`, `sendOrder()`

**Look For:** Unsafe read-then-update patterns, missing transaction wrappers, operations outside transactions

---

### **2. Tenant Isolation & RBAC Enforcement**

**Verify:**
- Every repository query includes `WHERE practiceId = ?`
- No raw Prisma access bypassing `scopeToPractice()`
- All mutating service methods call `requireRole(ctx, 'STAFF'|'ADMIN')`
- Server actions build `RequestContext` via `buildRequestContext()`

**Key Files:**
- `src/repositories/base/base-repository.ts` (scoping helper)
- All repositories: `src/repositories/*/`
- All services: `src/services/*/`
- Server actions: `app/(dashboard)/*/actions.ts`

**Look For:** Missing practiceId filters, services without RBAC checks, cross-tenant data leakage

---

### **3. Data Integrity & Schema Constraints**

**Identify Missing DB Constraints:**
- `LocationInventory.quantity >= 0` (currently code-only)
- `StockAdjustment.quantity != 0`
- `InventoryTransfer: fromLocationId != toLocationId`
- `OrderItem.quantity > 0`

**Key Files:**
- `prisma/schema.prisma` (current constraints)
- `src/domain/validators/` (business rules in code)

**Goal:** Document which invariants should be CHECK constraints vs acceptable as code validation

---

### **4. Receiving Workflow Correctness**

**Verify:**
- Partial receiving logic: How does it track "already received" quantities?
- Order status transitions: SENT → PARTIALLY_RECEIVED → RECEIVED
- Over-receiving handled correctly (supplier sent extra)
- Idempotency: Receipt cannot be confirmed twice
- Inventory updates atomic and in transaction

**Key Files:**
- `src/services/receiving/receiving-service.ts:confirmReceipt()`
- `src/repositories/receiving/receiving-repository.ts`

**Look For:** Status calculation bugs, race conditions, non-atomic updates

---

### **5. Item-Supplier Linking & Pricing**

**Verify:**
- Default supplier logic consistent across: quick reorder, low-stock ordering, templates
- Pricing lookup correct: `PracticeSupplierItem` by (practiceSupplierId, itemId)
- Template supplier mapping handles legacy `supplierId` gracefully (unmapped = skip with warning)

**Key Files:**
- `src/services/inventory/item-service.ts`
- `src/services/orders/order-service.ts` (quickOrderForItem, createOrdersFromLowStock, template methods)

**Look For:** Inconsistent supplier usage, pricing bugs, unmapped supplier failures

---

### **6. Authentication & Session Security**

**Verify:**
- Password reset tokens: expiration (60 min), reuse prevention, constant-time lookup
- Invite tokens: expiration (60 days), usage tracking, three scenarios handled (new user, existing user, logged-in)
- Session refresh after invite acceptance (new practice added to memberships)
- CallbackUrl validation (prevent open redirects)
- No email enumeration (generic errors for forgot password)

**Key Files:**
- `app/api/auth/forgot-password/route.ts`, `reset-password/route.ts`
- `app/api/invites/accept/route.ts`
- `auth.ts`, `auth.config.ts` (NextAuth config)
- `proxy.ts` (middleware, redirect logic)

**Look For:** Token reuse bugs, session staleness, open redirect vulnerabilities

---

### **7. Onboarding & Redirects (Verification Only)**

**Status:** ✅ Already implemented and working (no infinite loops, no stuck states)

**Verify:**
- Completion logic in `lib/onboarding-status.ts` robust under edge cases
- Session refresh after skip/complete
- Panel visibility tied to DB state (not just localStorage)
- No performance issues (N+1 queries, excessive checks)

**Key Files:**
- `lib/onboarding-status.ts`
- `src/services/settings/settings-service.ts`

**Note:** Redirects and onboarding flow are working. Only verify no regressions or edge case gaps.

---

## Implementation Task: Order Email Sending

**Requirement:** Direct Resend API call (no job queue for MVP)

**Implementation:**
1. Create `lib/email-templates.ts`: `renderOrderEmailTemplate(order: OrderWithRelations): string`
2. Update `src/services/orders/order-service.ts:sendOrder()`
   - Call email AFTER transaction commits (non-blocking)
   - 5-second timeout, abort if slow
   - Log errors but don't fail order sending
   - Handle missing supplier emails gracefully

**Key Principle:** Fire-and-forget. Email failures don't block order workflow.

---

## Deliverables

**Code Review Findings:**
- List unsafe transaction patterns with file:line locations
- List missing RBAC checks or tenant isolation gaps
- List missing DB constraints with suggested SQL migrations
- Document correctness issues in receiving/order workflows
- Security issues in auth/session handling

**Recommendations:**
- Architectural improvements
- Concurrency safety fixes
- Constraint migration priorities (P0 vs P1)

**Implementation:**
- Working order email sending integrated into order workflow

---

## Key Files Reference

**Services:**
- `src/services/orders/order-service.ts`
- `src/services/receiving/receiving-service.ts`
- `src/services/inventory/inventory-service.ts`
- `src/services/settings/settings-service.ts`

**Repositories:**
- `src/repositories/base/base-repository.ts`
- `src/repositories/inventory/inventory-repository.ts`
- `src/repositories/orders/order-repository.ts`
- `src/repositories/receiving/receiving-repository.ts`

**Auth:**
- `auth.ts`, `auth.config.ts`
- `proxy.ts` (middleware)
- `app/api/auth/*/route.ts`
- `app/api/invites/accept/route.ts`

**Schema:**
- `prisma/schema.prisma`

---

## MVP Scope & Limitations

**Acceptable for 1-3 medical practices:**
- Direct email sending (no job queue)
- In-memory rate limiting fallback (Redis optional)
- Service-layer validation (some missing DB constraints)
- Manual testing (no automated E2E tests)

**Not Acceptable:**
- Cross-tenant data leakage
- Race conditions causing negative inventory
- RBAC bypasses
- Authentication security issues

---

**Questions?** See full handover: `docs/MVP_HANDOVER_SENIOR_DEV.md`

**Coordination:** Founder handles all UI testing based on your findings.

**Goal:** Pilot-ready backend for 1-3 medical practices.

