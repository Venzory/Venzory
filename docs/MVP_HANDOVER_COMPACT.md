# Senior Backend Engineer: MVP Launch Brief

**Project:** Venzory  
**Goal:** Prepare for pilot with 1-3 medical practices  
**Scope:** MVP readiness (not full production scale)

---

## Quick Overview

**What is Venzory?**  
Multi-tenant inventory management SaaS for medical practices (GP clinics, medical offices). Core workflows: Items, Suppliers, Orders, Receiving, Inventory, Stock Counts.

**Tech Stack:**  
Next.js 16 + TypeScript + Prisma + PostgreSQL + NextAuth v5 + Resend (email) + Redis (optional)

**Architecture:**  
Layered pattern: API → Services → Repositories → Database  
Includes: RequestContext (tenant scoping), RBAC enforcement, transaction management, audit logging

---

## Your Role: Code Review & Architecture Audit

**Focus Areas:**
- Audit repository/service layers for correctness
- Verify transaction boundaries and concurrency safety
- Check tenant isolation and RBAC enforcement at code level
- Review data integrity rules vs database schema
- Identify structural gaps and failure modes
- Implement order email sending (only hands-on task)

**NOT Your Responsibility:**
- Manual UI flow testing (founder handles)
- Clicking through scenarios
- End-to-end smoke testing

**Your Deliverables:**
- Code review findings with file locations
- Architectural recommendations
- Test scenarios for founder to execute
- Documentation of assumptions and constraints

---

## 7 Core Tasks

### **Task 1: Transaction Boundaries & Atomicity Audit** (4-6 hours)
**Objective:** Verify multi-step operations use transactions correctly, inventory updates are atomic.

**Review:**
- `src/repositories/inventory/inventory-repository.ts` - Check for read-modify-write patterns
- `src/services/receiving/receiving-service.ts` - Verify receipt confirmation wraps all updates
- `src/services/orders/order-service.ts` - Check order creation transactions

**Look For:**
- Atomic increment/decrement usage (not read-then-update)
- All mutations within `withTransaction()` wrapper
- Proper error handling and rollback

**Deliverable:** List of unsafe patterns with fixes.

---

### **Task 2: Tenant Isolation & RBAC Review** (4-5 hours)
**Objective:** Verify tenant isolation at repository level, RBAC at service level.

**Review:**
- All repositories in `src/repositories/` - Every query scoped to `practiceId`?
- All services in `src/services/` - Every mutation checks `requireRole()`?
- Server actions in `app/(dashboard)/*/actions.ts` - All use `buildRequestContext()`?

**Look For:**
- Missing `WHERE practiceId = ?` in queries
- Service methods without RBAC checks
- Cross-tenant data leakage possibilities

**Deliverable:** List of RBAC gaps or isolation weaknesses.

---

### **Task 3: Data Integrity & Schema Constraints** (4-5 hours)
**Objective:** Identify business rules enforced only in code that should be DB constraints.

**Review:**
- `prisma/schema.prisma` - Current constraints
- `src/domain/validators/` - Business rule validation
- Compare code validation vs DB constraints

**Identify Missing:**
- `LocationInventory.quantity >= 0` (CHECK constraint)
- `StockAdjustment.quantity != 0`
- `InventoryTransfer: fromLocationId != toLocationId`
- `OrderItem.quantity > 0`

**Deliverable:** Prioritized list of missing constraints with SQL migration suggestions.

---

### **Task 4: Order Email Implementation** (4-6 hours)
**Objective:** Implement simple, direct email sending for purchase orders.

**Implementation:**
1. Create `lib/email-templates.ts` - `renderOrderEmailTemplate()` function
2. Update `src/services/orders/order-service.ts` - Add async email call AFTER transaction
3. Add timeout handling (5 seconds max, abort if slow)
4. Graceful degradation (no email = log warning, continue)
5. Test with Resend API in dev

**Requirements:**
- Fire-and-forget (don't block order sending if email fails)
- Log all outcomes (success, failure, timeout)
- Handle missing supplier emails gracefully

**Deliverable:** Working email integration in order workflow.

---

### **Task 5: Receiving Workflow Deep Audit** (4-5 hours)
**Objective:** Verify receiving handles partial/over-receiving and status transitions correctly.

**Review:**
- `src/services/receiving/receiving-service.ts:confirmReceipt()` - Status transition logic
- Partial receiving calculation - How does it track "already received"?
- Inventory updates - Atomic? In transaction?
- Idempotency - Can receipt be confirmed twice?

**Look For:**
- Status logic: SENT → PARTIALLY_RECEIVED → RECEIVED
- Concurrent receipt handling (two users, same order)
- Over-receiving (receive more than ordered)

**Deliverable:** Correctness issues with fixes.

---

### **Task 6: Item-Supplier Linking & Pricing Audit** (3-4 hours)
**Objective:** Verify supplier linking and pricing flow is consistent.

**Review:**
- `src/services/inventory/item-service.ts` - Default supplier logic
- `src/services/orders/order-service.ts` - Quick reorder, low-stock ordering, templates
- Pricing flow from `PracticeSupplierItem`
- Template supplier mapping (legacy `supplierId` vs `practiceSupplierId`)

**Look For:**
- Default supplier used consistently across all order creation methods
- Pricing lookup correct (by practiceSupplierId + itemId)
- Unmapped suppliers in templates handled gracefully

**Deliverable:** Supplier linking issues and improvements.

---

### **Task 7: Authentication & Session Edge Cases** (3-4 hours)
**Objective:** Review auth code for security issues and edge case handling.

**Review:**
- `app/api/auth/forgot-password/route.ts`, `reset-password/route.ts` - Token handling
- `app/api/invites/accept/route.ts` - Three scenarios: new user, existing user, logged-in user
- `auth.ts`, `auth.config.ts` - Session management, JWT updates
- `proxy.ts` - Middleware redirect logic, callbackUrl security

**Look For:**
- Token expiration and reuse prevention
- No email enumeration (generic errors)
- Session refresh after invite acceptance
- Open redirect prevention (callbackUrl validation)

**Deliverable:** Security issues with recommendations.

---

## Founder Responsibilities

### **Manual UI Flow Testing** (10-15 hours)
Execute test scenarios based on senior dev's findings:
- Authentication flows (8 scenarios: registration, login, reset, invites)
- Onboarding & redirects (6 scenarios)
- Orders workflow (8 scenarios: create, send, receive, templates)
- Receiving workflow (6 scenarios: partial, over-receiving)
- Inventory operations (6 scenarios: adjust, transfer, count)
- Settings & invites (6 scenarios)

### **UX Polish** (5-8 hours)
- Add tooltips and help text
- Improve error messages
- Add loading spinners
- Polish email template styling
- Confirmation dialogs

### **Documentation** (5-7 hours)
- User guide for pilot customers
- Troubleshooting guide
- Admin setup checklist
- Known limitations document

### **Pre-Launch Testing** (3-5 hours)
- Quick smoke test (30 min)
- Full regression test (2-3 hours)

---

## Timeline & Effort

**Senior Dev:** 26-35 hours
- Code review: 22-29 hours
- Email implementation: 4-6 hours

**Founder:** 23-35 hours
- UI testing: 10-15 hours
- UX polish: 5-8 hours
- Documentation: 5-7 hours
- Regression testing: 3-5 hours

**Combined Timeline:** 2-3 weeks with parallel work

---

## MVP Launch Checklist

### **Senior Dev Deliverables**
- [ ] Transaction boundaries audited (unsafe patterns documented)
- [ ] Tenant isolation verified at code level (no leaks possible)
- [ ] RBAC enforcement verified in all services
- [ ] Missing DB constraints documented with SQL migrations
- [ ] Order email sending implemented and tested
- [ ] Receiving workflow logic verified (partial/over-receiving)
- [ ] Item-supplier linking audited
- [ ] Auth/session edge cases reviewed
- [ ] Code review findings documented with file locations

### **Founder Deliverables**
- [ ] All authentication flows tested in UI
- [ ] All core workflows tested end-to-end
- [ ] All issues from code review verified as fixed
- [ ] UX polish complete (tooltips, messages, spinners)
- [ ] User guide written with screenshots
- [ ] Troubleshooting guide complete
- [ ] Admin setup checklist ready
- [ ] Full regression test passed

### **Data Integrity Verification**
- [ ] Inventory updates atomic (confirmed by founder testing)
- [ ] Receipt confirmation idempotent (confirmed by founder testing)
- [ ] Tenant isolation working (confirmed by founder testing)
- [ ] Order email sending working or gracefully failing

---

## Key Files to Review

**Authentication & Sessions:**
- `auth.ts`, `auth.config.ts` - NextAuth configuration
- `proxy.ts` - Middleware (redirects, auth checks)
- `app/api/auth/*/route.ts` - Auth endpoints
- `app/api/invites/accept/route.ts` - Invite handling

**Core Services:**
- `src/services/orders/order-service.ts` - Order lifecycle
- `src/services/receiving/receiving-service.ts` - Goods receiving
- `src/services/inventory/inventory-service.ts` - Inventory operations
- `src/services/settings/settings-service.ts` - User/practice management

**Repositories:**
- `src/repositories/base/base-repository.ts` - Tenant scoping helpers
- `src/repositories/inventory/inventory-repository.ts` - Inventory data access
- `src/repositories/orders/order-repository.ts` - Order data access
- `src/repositories/receiving/receiving-repository.ts` - Receiving data access

**Database:**
- `prisma/schema.prisma` - Database schema and constraints

---

## Known MVP Limitations

**Document these for pilot users:**
- Email delivery is best-effort (failures don't block orders)
- Users assumed to belong to single practice (no practice switcher)
- No background jobs (all operations synchronous)
- Basic rate limiting (in-memory fallback acceptable for 1-3 users)
- No automated E2E tests (manual testing only)
- No file uploads (product images, invoices not supported)

---

## Contact & Next Steps

**Day 1:**
1. Read full handover doc: `docs/MVP_HANDOVER_SENIOR_DEV.md`
2. Clone repo, set up local dev environment
3. Review key files listed above

**Week 1:**
- Tasks 1-3 (architecture review)
- Task 4 (email implementation)

**Week 2:**
- Tasks 5-7 (workflow and auth review)
- Document findings
- Coordinate with founder on test scenarios

**Week 3:**
- Fix any critical issues found
- Support founder during UI testing
- Final review before pilot launch

---

**Questions?** See full handover document or contact founder.

**MVP Goal:** Pilot-ready Venzory for 1-3 medical practices to validate core workflows and gather feedback.

