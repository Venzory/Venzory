# Senior Backend Engineer Handover: MVP Launch Preparation

**Project:** Venzory  
**Goal:** Prepare for pilot launch with 1-3 medical practices  
**Scope:** MVP readiness, not full production scale  
**Date:** November 23, 2025

---

## Overview

Venzory is a **multi-tenant inventory management platform** for medical practices. We're preparing for pilot launch with 1-3 medical practices to validate core workflows before scaling.

**Tech Stack:**
- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth v5 (authentication)
- Resend (email)
- Redis (optional for MVP)

**Architecture Pattern:**
```
Server Actions / API Routes
    ↓
Services (business logic)
    ↓
Repositories (data access)
    ↓
PostgreSQL
```

---

## Your Role: Architecture & Code Review

**Primary Focus:**
- Audit architecture layers (repository → service → domain logic)
- Verify transaction boundaries and concurrency safety
- Check tenant isolation and RBAC enforcement at code level
- Review data integrity rules vs database schema
- Identify structural gaps and hidden assumptions
- Spot potential failure modes in business logic

**What You're NOT Responsible For:**
- Manual UI flow testing (founder will handle with checklists)
- Clicking through all user scenarios
- End-to-end smoke testing

**Your Output:**
- Code review findings with specific file locations
- Recommendations for architectural improvements
- List of what needs verification (founder will test)
- Documentation of assumptions and invariants

---

## Responsibility Summary

| Area | Senior Dev | Founder |
|------|------------|---------|
| **Architecture Review** | Audit repos, services, domain logic | - |
| **Code Implementation** | Order email sending | - |
| **Concurrency & Transactions** | Review and fix unsafe patterns | - |
| **Tenant Isolation** | Verify at code level | - |
| **RBAC Enforcement** | Verify at service layer | - |
| **Data Integrity** | Identify missing constraints | - |
| **UI Flow Testing** | Define test scenarios | Execute all manual tests |
| **Authentication Testing** | Review token/session code | Test all auth flows in UI |
| **Order/Receiving Testing** | Review business logic | Test workflows end-to-end |
| **UX Polish** | - | Tooltips, messages, styling |
| **Documentation** | - | User guide, troubleshooting |
| **Pilot Support** | - | Handle customer questions |

**Key Principle:** Senior dev reviews code and architecture. Founder tests UI and supports users.

---

## 1. MVP Launch Requirements

### What Must Work for Pilot Users

#### **Authentication Flows**
✅ **Must be rock-solid:**

1. **User Registration**
   - New practice owner signs up at `/register`
   - Creates User + Practice + PracticeUser (ADMIN role)
   - Redirects to onboarding flow
   - Sets `activePracticeId` in session

2. **Login**
   - Email + password at `/login`
   - NextAuth credentials provider
   - Rate limited (10 attempts / 15 min)
   - Redirects to dashboard or onboarding

3. **Password Reset**
   - Request reset at `/forgot-password`
   - Email with 60-minute token
   - Reset at `/reset-password?token=xxx`
   - Rate limited (3 requests / hour)

4. **User Invitations**
   - Admin invites user via email
   - User receives email with invite link
   - Clicks link → registers/logs in → accepts invite
   - Joins practice with assigned role

5. **Session Management**
   - JWT-based sessions (30-day expiry)
   - Secure cookies (HttpOnly, SameSite=Lax)
   - Session includes `userId`, `practiceId`, `role`

#### **Onboarding Flow**
✅ **Must not get stuck or loop:**

**Trigger:** After first login or registration, if practice is incomplete.

**Steps:**
1. Create locations
2. Add suppliers
3. Add items to catalog
4. Place first order

**Completion Conditions:**
- Has ≥1 location
- Has ≥1 supplier
- Has ≥1 item
- Has ≥1 order

**Exit Points:**
- "Skip" button → marks practice as onboarding skipped
- "Complete Setup" → marks practice as onboarding complete
- Automatic completion when all conditions met

**Dashboard Access:**
- Onboarding panel shows for incomplete practices (STAFF/ADMIN only)
- Can dismiss panel but it returns until skipped/completed
- Must not block access to dashboard features

#### **Practice Membership Logic**
✅ **Must handle multi-user scenarios:**

- User can belong to multiple practices (via `PracticeUser` junction table)
- Session stores `activePracticeId` (currently active practice)
- All data queries scoped to `activePracticeId`
- Switching practices not implemented yet (MVP: assume single practice per user)

#### **Core Workflows**
✅ **Must work end-to-end:**

1. **My Items (Practice Catalog)**
   - View items linked to practice
   - Add items from global catalog
   - Filter by supplier, low stock
   - Link to suppliers and set default supplier

2. **Orders**
   - Create draft order
   - Add items with quantities
   - Send order (DRAFT → SENT)
   - Email purchase order to supplier
   - View order history

3. **Receiving Goods**
   - Create goods receipt (linked to order or standalone)
   - Add received items with quantities
   - Confirm receipt → updates inventory
   - Updates order status (SENT → PARTIALLY_RECEIVED → RECEIVED)

4. **Inventory**
   - View stock levels by location
   - Manual stock adjustments
   - Transfers between locations
   - Low-stock detection

5. **Stock Counting**
   - Create count session for location
   - Enter counted quantities
   - Complete count → applies adjustments
   - Handles concurrent inventory changes

#### **Basic Security Requirements**

✅ **Tenant Isolation:**
- All queries include `WHERE practiceId = ?`
- Users cannot access other practices' data
- Integration tests verify cross-tenant access blocked

✅ **CSRF Protection:**
- All mutations protected (POST/PUT/PATCH/DELETE)
- Double-submit cookie pattern with HMAC signing
- Server actions call `verifyCsrfFromHeaders()`

✅ **RBAC (Role-Based Access Control):**
- ADMIN: Full access (settings, users, dangerous operations)
- STAFF: Orders, receiving, inventory, stock counts
- VIEWER: Read-only access
- Enforced at service layer via `requireRole(ctx, 'STAFF')`

✅ **Rate Limiting (Minimal):**
- Login: 10 attempts / 15 minutes
- Password reset: 3 requests / hour
- Uses Redis if available, in-memory fallback acceptable for MVP

---

## 2. Critical MVP Blockers

### 🔴 Authentication & Access Issues

#### **Issue 1: Invite Acceptance Flow**
**Problem Areas to Verify:**

1. **Token Validation:**
   - Check token not expired (60 days)
   - Check token not already used
   - Handle invalid/missing tokens gracefully

2. **User State Handling:**
   ```typescript
   // Scenario A: Invited user has no account yet
   // → Should redirect to registration with pre-filled email
   
   // Scenario B: Invited user already has account
   // → Should log in, accept invite, redirect to dashboard
   
   // Scenario C: Logged-in user clicks invite link
   // → Should accept invite immediately, redirect to dashboard
   ```

3. **Post-Acceptance Redirect:**
   - Must set `activePracticeId` to newly joined practice
   - Must refresh session to include new practice membership
   - Must redirect to correct dashboard

**Code Locations:**
- `app/api/invites/accept/route.ts`
- `app/(dashboard)/settings/actions.ts` (invite creation)
- `app/(auth)/accept-invite/page.tsx` (if exists)

**Test Scenarios:**
- [ ] Send invite → register new user → accept → verify dashboard access
- [ ] Send invite → existing user logs in → accept → verify practice added
- [ ] Send invite → user already logged in → click link → verify immediate accept

---

#### **Issue 2: Onboarding & Redirect Flow (Verification)**
**Status:** ✅ Already implemented. Verify robustness under edge cases.

**What Already Works:**
- No infinite redirect loops between login/dashboard/onboarding
- Onboarding completion logic properly updates database and session
- Skip/complete actions work correctly
- Panel visibility tied to database state

**Your Audit Focus:**

1. **Review Redirect Logic:**
   ```typescript
   // Verify middleware logic in proxy.ts:
   // - No circular redirects possible
   // - Onboarding check doesn't block critical paths
   // - CallbackUrl properly preserved across redirects
   ```

2. **Review Onboarding State Management:**
   ```typescript
   // In lib/onboarding-status.ts and services:
   const isComplete = await settingsService.checkOnboardingStatus(practiceId);
   
   // Verify:
   // - Completion conditions are reasonable
   // - No N+1 queries in status check
   // - State transitions are atomic (skip/complete in transaction)
   // - Session updates properly propagate
   ```

3. **Review Panel Visibility Logic:**
   - Check that DB state is source of truth
   - LocalStorage only for UI performance, not state
   - Panel doesn't interfere with normal navigation

**Code Locations to Review:**
- `lib/onboarding-status.ts` (status check logic)
- `src/services/settings/settings-service.ts` (completion actions)
- `app/(dashboard)/layout.tsx` (panel rendering logic)
- `app/(dashboard)/_actions/onboarding-actions.ts` (skip/complete actions)
- `proxy.ts` (redirect middleware)

**What to Look For:**
- [ ] Race conditions in completion check (multiple users in same practice)
- [ ] Session staleness after skip/complete (does session refresh?)
- [ ] Edge case: What if onboarding data deleted while user active?
- [ ] Performance: Is status checked on every page load? Cached?

**Founder Will Test:**
- UI flow: Register → skip → logout → login → verify panel stays hidden
- UI flow: Register → complete steps → verify panel auto-hides
- UI flow: Navigate between pages while incomplete → no unexpected redirects

---

#### **Issue 3: Password Reset Token Handling**
**Problem Areas to Verify:**

1. **Token Expiration:**
   - Tokens valid for 60 minutes
   - Expired tokens show clear error message
   - Used tokens cannot be reused

2. **Race Conditions:**
   - Multiple reset requests don't invalidate previous tokens prematurely
   - Token usage marked in transaction

3. **Error Messages:**
   - Don't leak whether email exists in system
   - Generic "If email exists, you'll receive a link" message

**Code Locations:**
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`

**Test Scenarios:**
- [ ] Request reset → receive email → use token → password changed
- [ ] Request reset → wait 61 minutes → token expired error
- [ ] Use token twice → second use fails
- [ ] Request reset with non-existent email → no error, no email sent

---

### 🔴 Core Workflow Issues

#### **Issue 4: Order Email Sending**
**Current State:** Email sending code commented out in `sendOrder()` action.

**MVP Solution (No Job Queue):**

**Option A: Direct Email Send (Simple)**
```typescript
// In OrderService.sendOrder()
try {
  await emailQueue.add('send-order-email', { ... });
} catch (error) {
  logger.error({ error, orderId }, 'Failed to queue order email');
  // ⚠️ Don't fail the order sending - email is best-effort
}
```

Change to:
```typescript
// Direct send with timeout
try {
  await sendOrderEmail(order, { timeout: 5000 });
  logger.info({ orderId }, 'Order email sent successfully');
} catch (error) {
  logger.error({ error, orderId }, 'Failed to send order email');
  // Continue - order is still marked SENT
}
```

**Option B: Generate Downloadable PO**
- Create HTML/PDF purchase order
- Store in `/tmp` or return as blob
- User downloads and emails manually
- Simpler and more reliable for MVP

**Recommendation:** Option A with short timeout. Email failures don't block workflow.

**Code Locations:**
- `src/services/orders/order-service.ts:398-420`
- `src/services/orders/delivery/email-strategy.ts`

**Implementation:**
```typescript
async function sendOrderEmail(order: OrderWithRelations, opts?: { timeout?: number }) {
  const html = renderOrderEmailTemplate(order);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts?.timeout || 10000);
  
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: order.practiceSupplier?.globalSupplier?.email || order.practiceSupplier?.contactEmail,
      subject: `Purchase Order #${order.id}`,
      html,
    }, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

#### **Issue 5: Receiving Workflow Edge Cases**
**Problem Areas to Verify:**

1. **Partial Receiving Logic:**
   ```typescript
   // When receiving order items:
   // - Track already-received quantities
   // - Show remaining quantities in UI
   // - Allow over-receiving (business rule: supplier sent extra)
   // - Update order status correctly:
   //   → SENT if nothing received yet
   //   → PARTIALLY_RECEIVED if some items received
   //   → RECEIVED if all items received (or manually closed)
   ```

2. **Inventory Update Atomicity:**
   ```typescript
   // Must happen in transaction:
   await withTransaction(async (tx) => {
     // 1. Create GoodsReceipt
     // 2. Create GoodsReceiptLines
     // 3. Update LocationInventory for each item
     // 4. Update Order status
     // 5. Log to AuditLog
   });
   ```

3. **Concurrent Receipt Handling:**
   - Two users receiving same order simultaneously
   - Must not duplicate inventory updates
   - Use transaction isolation

**Code Locations:**
- `src/services/receiving/receiving-service.ts`
- `src/repositories/receiving/receiving-repository.ts`
- `app/(dashboard)/receiving/[id]/page.tsx`

**Test Scenarios:**
- [ ] Order 10 items → receive 5 → verify status PARTIALLY_RECEIVED
- [ ] Order 10 items → receive 5 → receive 5 more → verify status RECEIVED
- [ ] Order 10 items → receive 12 → verify inventory shows 12 (over-receiving allowed)
- [ ] Create receipt → confirm → verify inventory updated
- [ ] Create receipt → cancel → verify inventory unchanged

---

#### **Issue 6: Stock Adjustment Validation**
**Problem Areas to Verify:**

1. **Negative Stock Prevention:**
   ```typescript
   // Service layer checks:
   if (newQuantity < 0) {
     throw new ValidationError('Cannot adjust stock below zero');
   }
   
   // ⚠️ No DB constraint yet - concurrency risk
   ```

2. **Location Validation:**
   - Verify location exists and belongs to practice
   - Verify item exists and belongs to practice

3. **Audit Trail:**
   - All adjustments logged to `StockAdjustment` table
   - Includes reason, note, actor

**Code Locations:**
- `src/services/inventory/inventory-service.ts`
- `src/repositories/inventory/inventory-repository.ts`

**Test Scenarios:**
- [ ] Adjust stock +10 → verify quantity increased
- [ ] Adjust stock -10 → verify quantity decreased
- [ ] Try adjust -999 when only 5 available → verify error
- [ ] Verify audit log created with correct data

---

#### **Issue 7: Item-Supplier Linking Consistency**
**Problem Areas to Verify:**

1. **Default Supplier Logic:**
   ```typescript
   // Item has defaultPracticeSupplierId
   // Must be valid PracticeSupplier for this practice
   // Used in:
   // - Quick reorder (one-click ordering)
   // - Low-stock ordering (auto-create orders)
   // - Template-based ordering
   ```

2. **Supplier Catalog vs My Items:**
   - Supplier Catalog: Global products available from all suppliers
   - My Items: Practice-specific items linked to suppliers
   - Adding item from catalog: Creates Item + sets defaultPracticeSupplier
   - Removing item: Soft delete or hard delete? (Check implementation)

3. **Pricing Consistency:**
   ```typescript
   // Pricing stored in PracticeSupplierItem
   // When creating order, use pricing from:
   // 1. PracticeSupplierItem (if exists)
   // 2. Manual entry by user
   // 3. NULL (user must enter price)
   ```

**Code Locations:**
- `src/services/inventory/item-service.ts`
- `app/(dashboard)/my-items/actions.ts`
- `app/(dashboard)/supplier-catalog/actions.ts`

**Test Scenarios:**
- [ ] Add item from catalog → set default supplier → verify link created
- [ ] Create order with item → verify price pre-filled if available
- [ ] Remove item from catalog → verify safe deletion or error if in use
- [ ] Quick reorder → verify uses default supplier

---

#### **Issue 8: Order Template Supplier Mapping**
**Current State:** Templates reference legacy `supplierId` with runtime mapping to `PracticeSupplier`.

**Problem:** Complex mapping logic, potential for unmapped suppliers.

**MVP Fix (Minimal):**
```typescript
// In template-based ordering:
const practiceSupplierId = templateItem.practiceSupplierId 
  || templateItem.item?.defaultPracticeSupplierId 
  || null;

if (!practiceSupplierId) {
  // Skip this item with warning
  logger.warn({ templateItemId: templateItem.id }, 'No practice supplier mapping');
  skippedItems.push(templateItem.item.name);
  continue;
}
```

**Better Fix (Post-MVP):** Complete supplier migration (schema change + backfill).

**Code Locations:**
- `src/services/orders/order-service.ts:1140-1207`

**Test Scenarios:**
- [ ] Create template with items → verify suppliers mapped correctly
- [ ] Use template to create order → verify order has correct suppliers
- [ ] Template with unmapped supplier → verify graceful skip with message

---

### 🔴 Redirect & Routing (Verification)

#### **Issue 9: SSR/CSR Consistency & Redirect Handling**
**Status:** ✅ Core functionality working. Verify edge cases and security.

**Your Audit Focus:**

1. **Review Session Consistency:**
   ```typescript
   // Middleware (Edge Runtime) vs Server Components (Node Runtime)
   // Verify both use same session source
   // Check for timing issues or staleness
   ```
   
   **Code Location:** `proxy.ts` (middleware), `app/(dashboard)/layout.tsx`

2. **Review Redirect Logic:**
   ```typescript
   // Verify no circular redirects:
   // - Authenticated user at /login → /dashboard
   // - Unauthenticated user at /dashboard → /login
   // - Incomplete practice → onboarding panel shown (no redirect)
   ```
   
   **What to Look For:**
   - Are there any edge cases where redirects could loop?
   - Do all protected routes have consistent auth checks?
   - Is middleware logic simple enough to not create race conditions?

3. **Review callbackUrl Security:**
   ```typescript
   // After login, redirect to original page
   // MUST validate callbackUrl is internal (prevent open redirect)
   ```
   
   **Code Location:** `app/(auth)/login/page.tsx`, middleware redirect logic
   
   **Security Check:**
   - [ ] CallbackUrl validated against same origin
   - [ ] No absolute URLs allowed
   - [ ] No javascript: or data: URLs possible
   - [ ] Fallback to /dashboard if invalid

**Code Locations to Review:**
- `proxy.ts` (middleware - Edge Runtime)
- `app/(dashboard)/layout.tsx` (server component auth)
- `app/(auth)/login/page.tsx` (login redirect logic)
- `lib/auth.ts` (session helpers)

**Founder Will Test:**
- UI flow: Visit /orders logged out → redirected to login → login → back to /orders
- UI flow: Visit /login logged in → redirected to /dashboard
- UI flow: Open redirect attempt with malicious callbackUrl → blocked

---

## 3. Simple MVP Email Sending

### Recommended Approach: Direct Send with Timeout

**Implementation Plan:**

1. **Create Email Template Function**
   ```typescript
   // lib/email-templates.ts
   export function renderOrderEmailTemplate(order: OrderWithRelations): string {
     const supplierName = order.practiceSupplier?.customLabel 
       || order.practiceSupplier?.globalSupplier?.name 
       || 'Supplier';
     
     const itemsTable = order.items.map(item => `
       <tr>
         <td>${item.item.name}</td>
         <td>${item.quantity}</td>
         <td>${item.unitPrice ? `€${item.unitPrice}` : '-'}</td>
       </tr>
     `).join('');
     
     return `
       <h2>Purchase Order</h2>
       <p>From: ${order.practice.name}</p>
       <p>To: ${supplierName}</p>
       <p>Date: ${new Date().toLocaleDateString()}</p>
       
       <table border="1">
         <tr><th>Item</th><th>Quantity</th><th>Price</th></tr>
         ${itemsTable}
       </table>
       
       <p>Notes: ${order.notes || 'None'}</p>
     `;
   }
   ```

2. **Wire into OrderService**
   ```typescript
   // src/services/orders/order-service.ts
   async sendOrder(ctx: RequestContext, orderId: string) {
     const updatedOrder = await withTransaction(async (tx) => {
       // ... existing status update logic ...
       
       return this.orderRepository.findOrderById(orderId, ctx.practiceId, { tx });
     });
     
     // Send email AFTER transaction commits (non-blocking)
     this.sendOrderEmailAsync(updatedOrder).catch(error => {
       logger.error({ error, orderId }, 'Failed to send order email');
     });
     
     return updatedOrder;
   }
   
   private async sendOrderEmailAsync(order: OrderWithRelations) {
     const recipientEmail = order.practiceSupplier?.globalSupplier?.email 
       || order.practiceSupplier?.contactEmail;
     
     if (!recipientEmail) {
       logger.warn({ orderId: order.id }, 'No supplier email - skipping');
       return;
     }
     
     const html = renderOrderEmailTemplate(order);
     
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 5000);
     
     try {
       await resend.emails.send({
         from: env.EMAIL_FROM,
         to: recipientEmail,
         subject: `Purchase Order from ${order.practice.name}`,
         html,
       });
       
       logger.info({ orderId: order.id, recipientEmail }, 'Order email sent');
     } catch (error) {
       logger.error({ error, orderId: order.id }, 'Order email send failed');
       // Don't throw - order is already marked SENT
     } finally {
       clearTimeout(timeoutId);
     }
   }
   ```

3. **Graceful Degradation**
   - If Resend API key not configured: Log warning, continue
   - If email send fails: Log error, continue
   - If no supplier email: Log warning, continue
   - Order always marked SENT regardless of email success

**MVP Simplifications:**
- ✅ No job queue needed
- ✅ No retry logic needed
- ✅ Fire-and-forget email sending
- ✅ Failures don't block users
- ⚠️ Email delivery not guaranteed (acceptable for MVP with 1-3 users)

**Alternative (Even Simpler):**
Generate downloadable HTML purchase order that users can email manually:
```typescript
// Return HTML as download instead of emailing
export async function downloadPurchaseOrder(orderId: string) {
  const order = await getOrderWithDetails(orderId);
  const html = renderOrderEmailTemplate(order);
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="PO-${orderId}.html"`,
    },
  });
}
```

---

## 4. Minimal Stability Work

### Edge Cases to Fix

#### **1. Concurrent Inventory Updates**
**Problem:** Two users adjusting same item simultaneously.

**MVP Fix:**
```typescript
// Use Prisma's optimistic concurrency via version field
// OR: Use database-level atomic updates

// BEFORE:
const current = await prisma.locationInventory.findUnique(...);
await prisma.locationInventory.update({
  where: { ... },
  data: { quantity: current.quantity + adjustment }
});

// AFTER (atomic):
await prisma.locationInventory.update({
  where: { ... },
  data: { quantity: { increment: adjustment } }
});
```

**Code Locations:**
- `src/repositories/inventory/inventory-repository.ts`

---

#### **2. Double Receipt Prevention**
**Problem:** User clicks "Confirm Receipt" twice quickly.

**MVP Fix:**
```typescript
// Check receipt status before confirming
if (receipt.status !== 'DRAFT') {
  throw new BusinessRuleViolationError('Receipt already confirmed');
}

// Update status in same transaction as inventory updates
await withTransaction(async (tx) => {
  const receipt = await tx.goodsReceipt.findUnique({
    where: { id: receiptId },
  });
  
  if (receipt.status !== 'DRAFT') {
    throw new BusinessRuleViolationError('Receipt already confirmed');
  }
  
  // Update status first (locks row)
  await tx.goodsReceipt.update({
    where: { id: receiptId },
    data: { status: 'CONFIRMED' },
  });
  
  // Then update inventory
  // ...
});
```

**Code Locations:**
- `src/services/receiving/receiving-service.ts`

---

#### **3. Supplier Email Validation**
**Problem:** Some suppliers may not have email addresses.

**MVP Fix:**
```typescript
// In order sending:
if (!supplierEmail) {
  // Show warning in UI instead of failing
  return {
    success: true,
    warning: 'Order sent but no email configured for supplier. Download PO manually.',
  };
}
```

**Code Locations:**
- `src/services/orders/order-service.ts`
- `app/(dashboard)/orders/[id]/page.tsx` (show warning banner)

---

#### **4. Session Refresh After Invite Accept**
**Problem:** Session doesn't include new practice membership until logout/login.

**MVP Fix:**
```typescript
// After accepting invite:
await prisma.practiceUser.create({ ... });

// Trigger session update
await update({
  user: {
    ...session.user,
    memberships: [...session.user.memberships, newMembership],
    activePracticeId: newMembership.practiceId,
  }
});

// Redirect to dashboard
redirect('/dashboard');
```

**Code Locations:**
- `app/api/invites/accept/route.ts`

---

#### **5. Location Deletion Safety**
**Problem:** Deleting location with inventory could orphan data.

**MVP Fix:**
```typescript
// Before deletion, check for inventory
const inventoryCount = await prisma.locationInventory.count({
  where: { locationId },
});

if (inventoryCount > 0) {
  throw new BusinessRuleViolationError(
    'Cannot delete location with inventory. Transfer or adjust stock first.'
  );
}

// Also check for child locations
const childCount = await prisma.location.count({
  where: { parentId: locationId },
});

if (childCount > 0) {
  throw new BusinessRuleViolationError(
    'Cannot delete location with child locations. Delete children first.'
  );
}
```

**Code Locations:**
- `src/services/inventory/inventory-service.ts`
- Already implemented per docs, but verify working correctly

---

## 5. Recommended Senior-Only Tasks (MVP)

### Architecture & Code Review Focus

Your role is to **audit the code**, not manually test UI flows. For each task, review the implementation, identify issues, and document what needs verification (founder will test).

---

#### **Task 1: Transaction Boundary & Atomicity Audit** (4-6 hours)
**Objective:** Verify all multi-step operations use transactions correctly and inventory updates are atomic.

**Code Review Checklist:**

1. **Audit Inventory Updates:**
   ```typescript
   // Find all LocationInventory.quantity modifications
   // Verify they use atomic increment/decrement
   // Check for read-modify-write patterns (unsafe)
   ```
   
   **Files to Review:**
   - `src/repositories/inventory/inventory-repository.ts`
   - `src/services/inventory/inventory-service.ts`
   - `src/services/receiving/receiving-service.ts`
   
   **Look For:**
   - [ ] Read-then-update patterns that could race
   - [ ] Missing `{ increment: delta }` in updates
   - [ ] Updates outside transactions when they should be inside

2. **Audit Receiving Transaction Boundaries:**
   ```typescript
   // Verify GoodsReceipt confirmation wraps:
   // 1. Status update (DRAFT → CONFIRMED)
   // 2. Inventory updates (all items)
   // 3. Order status update (if linked)
   // 4. Audit log creation
   ```
   
   **Files to Review:**
   - `src/services/receiving/receiving-service.ts:confirmReceipt()`
   - `src/repositories/receiving/receiving-repository.ts`
   
   **Look For:**
   - [ ] All updates in `withTransaction()` wrapper
   - [ ] Idempotency check (can't confirm twice)
   - [ ] Proper error handling and rollback

3. **Audit Order Transaction Boundaries:**
   ```typescript
   // Verify order creation/sending wraps:
   // 1. Order creation
   // 2. OrderItem creation (all items)
   // 3. Status update
   // 4. Audit log creation
   ```
   
   **Files to Review:**
   - `src/services/orders/order-service.ts:createOrder()`, `sendOrder()`
   - `src/repositories/orders/order-repository.ts`
   
   **Look For:**
   - [ ] All mutations in same transaction
   - [ ] Email sending NOT in transaction (async, best-effort)
   - [ ] Proper validation before transaction starts

**Deliverable:** Document of any unsafe patterns found, with file/line numbers and suggested fixes.

---

#### **Task 2: Tenant Isolation & RBAC Code Review** (4-5 hours)
**Objective:** Verify tenant isolation enforced consistently and RBAC checks present in all services.

**Code Review Checklist:**

1. **Repository Layer - Tenant Scoping:**
   ```typescript
   // Every repository method must scope to practiceId
   // Check for any queries missing WHERE practiceId = ?
   ```
   
   **Files to Review:**
   - `src/repositories/base/base-repository.ts` (scopeToPractice helper)
   - `src/repositories/orders/order-repository.ts`
   - `src/repositories/inventory/inventory-repository.ts`
   - `src/repositories/receiving/receiving-repository.ts`
   
   **Look For:**
   - [ ] Every findMany/findFirst includes practiceId filter
   - [ ] No raw Prisma queries bypassing scope
   - [ ] Updates/deletes verify practiceId ownership
   - [ ] No cross-tenant data leakage possible

2. **Service Layer - RBAC Enforcement:**
   ```typescript
   // Every mutating service method must check role
   // requireRole(ctx, 'STAFF') or requireRole(ctx, 'ADMIN')
   ```
   
   **Files to Review:**
   - `src/services/orders/order-service.ts`
   - `src/services/inventory/inventory-service.ts`
   - `src/services/receiving/receiving-service.ts`
   - `src/services/settings/settings-service.ts`
   
   **Look For:**
   - [ ] All CREATE/UPDATE/DELETE operations check role
   - [ ] READ operations check at minimum VIEWER role
   - [ ] Admin-only operations (user management, settings) check ADMIN
   - [ ] No service methods skip RBAC checks

3. **API Layer - RequestContext Usage:**
   ```typescript
   // All server actions and API routes build RequestContext
   // Services never called with raw session data
   ```
   
   **Files to Review:**
   - `app/(dashboard)/*/actions.ts` (server actions)
   - `app/api/*/route.ts` (API routes)
   
   **Look For:**
   - [ ] All actions call `buildRequestContext()`
   - [ ] Context passed to all service methods
   - [ ] No services called without context
   - [ ] No direct Prisma access in action layer

**Deliverable:** List of any RBAC gaps or tenant isolation weaknesses with file locations.

---

#### **Task 3: Data Integrity & Schema Constraint Review** (4-5 hours)
**Objective:** Identify business rules enforced only in code vs. should be database constraints.

**Code Review Checklist:**

1. **Inventory Invariants:**
   ```sql
   -- Check if these constraints exist in schema:
   -- LocationInventory.quantity >= 0
   -- StockAdjustment.quantity != 0
   -- InventoryTransfer: fromLocationId != toLocationId
   ```
   
   **Files to Review:**
   - `prisma/schema.prisma` (current constraints)
   - `src/domain/validators/inventory-validators.ts` (code validation)
   - `src/services/inventory/inventory-service.ts` (business rules)
   
   **Identify:**
   - [ ] Which invariants are code-only (concurrency risk)
   - [ ] Which invariants should be CHECK constraints
   - [ ] Which are acceptable as code validation

2. **Order & Receiving Invariants:**
   ```typescript
   // Business rules to check:
   // - OrderItem.quantity > 0
   // - Order can only be edited in DRAFT status
   // - Receipt can only be confirmed once
   // - Received quantity must be positive
   ```
   
   **Files to Review:**
   - `src/services/orders/order-service.ts`
   - `src/services/receiving/receiving-service.ts`
   - `src/domain/validators/order-validators.ts`
   
   **Identify:**
   - [ ] Status transition rules (where enforced?)
   - [ ] Quantity validations (code vs DB)
   - [ ] Idempotency checks (can operations be repeated safely?)

3. **Supplier & Item Linking:**
   ```typescript
   // Business rules to check:
   // - Item.defaultPracticeSupplierId must belong to same practice
   // - PracticeSupplier must link to valid GlobalSupplier
   // - OrderTemplateItem supplier references (legacy mapping)
   ```
   
   **Files to Review:**
   - `src/services/inventory/item-service.ts`
   - `src/services/orders/order-service.ts` (template methods)
   - `prisma/schema.prisma` (foreign keys)
   
   **Identify:**
   - [ ] Missing foreign key constraints
   - [ ] Orphaned data risks
   - [ ] Complex validation only in code (document as technical debt)

**Deliverable:** Prioritized list of missing constraints with SQL migration suggestions.

---

#### **Task 4: Order Email Implementation** (4-6 hours)
**Objective:** Implement simple, direct email sending for purchase orders.

**Implementation Work:**

1. **Create Email Template Function:**
   - File: `lib/email-templates.ts` (create new)
   - Function: `renderOrderEmailTemplate(order: OrderWithRelations): string`
   - Include: Practice info, supplier info, items table, totals, notes
   - Keep it simple: HTML only, no PDF generation

2. **Integrate into OrderService:**
   - File: `src/services/orders/order-service.ts`
   - Method: `sendOrder()` - add email call AFTER transaction commits
   - Timeout: 5 seconds max (abort if slow)
   - Error handling: Log error, don't fail order sending
   - Graceful degradation: No email = warning logged

3. **Test Cases to Consider:**
   - Supplier has no email → log warning, skip email
   - Resend API fails → log error, order still marked SENT
   - Resend timeout → abort, log warning, continue
   - Email succeeds → log success with message ID

**Reference Implementation:** See Section 3 of this document for complete code examples.

**Deliverable:** Working email sending integrated into order workflow.

---

#### **Task 5: Receiving Workflow Deep Audit** (4-5 hours)
**Objective:** Verify receiving logic handles partial/over-receiving and status transitions correctly.

**Code Review Checklist:**

1. **Partial Receiving Logic:**
   ```typescript
   // Verify calculation of "already received" quantities
   // Verify order status transitions:
   // - SENT → PARTIALLY_RECEIVED (some items received)
   // - PARTIALLY_RECEIVED → RECEIVED (all received or manually closed)
   ```
   
   **Files to Review:**
   - `src/services/receiving/receiving-service.ts:confirmReceipt()`
   - `src/repositories/receiving/receiving-repository.ts`
   - Logic for calculating remaining quantities
   
   **Look For:**
   - [ ] How does system know what's already received? (query GoodsReceiptLines)
   - [ ] Is calculation correct for multiple partial receipts?
   - [ ] Over-receiving handled? (receive more than ordered)
   - [ ] Status update logic robust?

2. **Inventory Update Correctness:**
   ```typescript
   // For each receipt line:
   // - Find or create LocationInventory
   // - Increment quantity atomically
   // - Handle batch/expiry data if present
   ```
   
   **Files to Review:**
   - `src/repositories/inventory/inventory-repository.ts:updateInventoryForReceipt()`
   - Transaction wrapping in receiving service
   
   **Look For:**
   - [ ] Atomic increment used (not read-modify-write)
   - [ ] Handles item not in location yet (create if needed)
   - [ ] All updates in same transaction
   - [ ] Proper error handling and rollback

3. **Concurrent Receipt Handling:**
   - What if two users confirm different receipts for same order simultaneously?
   - What if user clicks "Confirm" twice quickly?
   - Does transaction isolation prevent issues?
   
   **Identify:**
   - [ ] Race conditions possible?
   - [ ] Idempotency checks present?
   - [ ] Pessimistic locking needed? (SELECT FOR UPDATE)

**Deliverable:** Document of correctness issues found, with suggested fixes.

---

#### **Task 6: Item-Supplier Linking & Pricing Audit** (3-4 hours)
**Objective:** Verify supplier linking logic and pricing flow is consistent across flows.

**Code Review Checklist:**

1. **Default Supplier Logic:**
   ```typescript
   // When item created, defaultPracticeSupplierId set
   // Verify this is used in:
   // - Quick reorder (one-click ordering)
   // - Low-stock ordering
   // - Template-based ordering
   ```
   
   **Files to Review:**
   - `src/services/inventory/item-service.ts:createItem()`
   - `src/services/orders/order-service.ts:quickOrderForItem()`
   - `src/services/orders/order-service.ts:createOrdersFromLowStock()`
   
   **Look For:**
   - [ ] Default supplier validated (belongs to practice?)
   - [ ] Fallback behavior if no default supplier
   - [ ] Consistent logic across all ordering methods

2. **Pricing Flow:**
   ```typescript
   // Pricing stored in PracticeSupplierItem
   // When creating order:
   // 1. Try to get price from PracticeSupplierItem
   // 2. Fall back to manual entry (null unitPrice)
   ```
   
   **Files to Review:**
   - `src/services/orders/order-service.ts:createOrder()`
   - `src/services/orders/order-service.ts` (template methods)
   
   **Look For:**
   - [ ] Pricing lookup logic (by practiceSupplierId + itemId)
   - [ ] Null prices handled gracefully
   - [ ] No hardcoded prices or wrong price sources

3. **Template Supplier Mapping:**
   ```typescript
   // Legacy: OrderTemplateItem.supplierId (old Supplier model)
   // Current: Runtime mapping to PracticeSupplier
   // Check mapping logic for gaps
   ```
   
   **Files to Review:**
   - `src/services/orders/order-service.ts:createOrdersFromTemplate()`
   - Lines 1140-1207 (supplier mapping logic)
   
   **Identify:**
   - [ ] Unmapped suppliers handled? (skipped with warning)
   - [ ] Mapping correctness verified?
   - [ ] Document as technical debt for post-MVP cleanup

**Deliverable:** List of supplier linking issues and recommended improvements.

---

#### **Task 7: Authentication & Session Edge Cases** (3-4 hours)
**Objective:** Review authentication code for security issues and edge case handling.

**Code Review Checklist:**

1. **Token Handling (Reset, Invite):**
   ```typescript
   // Verify token expiration, usage tracking, and security
   ```
   
   **Files to Review:**
   - `app/api/auth/forgot-password/route.ts`
   - `app/api/auth/reset-password/route.ts`
   - `app/api/invites/accept/route.ts`
   
   **Look For:**
   - [ ] Token expiration checked (60 min reset, 60 days invite)
   - [ ] Token marked as used (prevents reuse)
   - [ ] Token lookup constant-time (prevent timing attacks)
   - [ ] No email enumeration (generic error messages)

2. **Invite Acceptance Edge Cases:**
   ```typescript
   // Three scenarios:
   // A. User has no account → redirect to register with email
   // B. User has account but not logged in → login then accept
   // C. User logged in → accept immediately
   ```
   
   **Files to Review:**
   - `app/api/invites/accept/route.ts`
   - Login/register integration with invite tokens
   
   **Look For:**
   - [ ] All three scenarios handled
   - [ ] Session updated after acceptance (includes new practice)
   - [ ] Redirect logic correct for each case
   - [ ] No way to bypass invite validation

3. **Session Management:**
   ```typescript
   // Verify session updates propagate correctly
   // Check session refresh after invite accept, onboarding complete
   ```
   
   **Files to Review:**
   - `auth.ts` (NextAuth callbacks)
   - `auth.config.ts` (session/JWT configuration)
   - `src/lib/context/context-builder.ts` (RequestContext building)
   
   **Look For:**
   - [ ] JWT token updates propagate to session
   - [ ] Session refresh after membership changes
   - [ ] No stale session data issues
   - [ ] Proper logout/session invalidation

**Deliverable:** Security issues or edge case bugs found with recommendations.

---

## 6. Recommended Tasks for Solo Founder (MVP-Safe)

### Your Responsibilities: UI Testing & Polish

Based on the senior engineer's code review findings, you'll conduct **end-to-end UI testing** to verify the system works correctly from a user's perspective.

---

### **A. Manual Flow Testing Checklists**

#### **Authentication Flows** (2-3 hours)
Based on senior dev's findings from Task 7, test these scenarios:

- [ ] **Registration:** New user → create practice → land on onboarding → see panel
- [ ] **Login:** Existing user → login → redirect to dashboard
- [ ] **Password Reset:** Request reset → receive email → click link → reset password → login
- [ ] **Password Reset Expiration:** Request reset → wait 61 min → token expired error
- [ ] **Rate Limiting:** Try 11 login attempts → verify rate limit error
- [ ] **Invite (New User):** Admin sends invite → new user receives email → clicks link → registers → accepts → joins practice → sees dashboard
- [ ] **Invite (Existing User):** Admin sends invite → existing user receives email → clicks link → logs in → accepts → practice added to memberships
- [ ] **Invite (Logged In):** Admin sends invite → logged-in user clicks link → immediate accept → redirect to dashboard
- [ ] **Expired Invite:** Try to accept invite after 60 days → error message

#### **Onboarding & Redirects** (1-2 hours)
Based on senior dev's findings from Task 2 (Issue 2):

- [ ] **Onboarding Panel:** Register → incomplete practice → see panel on dashboard
- [ ] **Skip Onboarding:** Click "Skip" → panel disappears → logout/login → panel stays gone
- [ ] **Complete Onboarding:** Add location → add supplier → add item → create order → panel auto-hides
- [ ] **No Redirect Loops:** Navigate between pages while incomplete → dashboard always accessible
- [ ] **Protected Routes:** Visit /orders logged out → redirect to login with callbackUrl → login → redirect back to /orders
- [ ] **Login While Authenticated:** Visit /login while logged in → redirect to /dashboard

#### **Orders Workflow** (2-3 hours)
Based on senior dev's findings from Tasks 4 & 6:

- [ ] **Create Draft Order:** Add items with quantities → save → verify appears in order list
- [ ] **Edit Draft Order:** Add more items → change quantities → save → verify changes persist
- [ ] **Send Order:** Send order → verify status SENT → verify email sent (check logs if supplier has email)
- [ ] **Send Order (No Email):** Send order to supplier with no email → verify warning banner shown
- [ ] **Quick Reorder:** From My Items page → click quick order → verify draft created with default supplier
- [ ] **Template-Based Order:** Create template → use template → verify order created with correct suppliers
- [ ] **Low-Stock Ordering:** Items below reorder point → create orders from low stock → verify grouped by supplier
- [ ] **Delete Draft:** Delete draft order → verify removed from list

#### **Receiving Workflow** (2-3 hours)
Based on senior dev's findings from Task 5:

- [ ] **Create Receipt (Linked):** From SENT order → click "Receive" → add items → confirm → verify inventory updated
- [ ] **Partial Receiving:** Order 10 items → receive 5 → verify status PARTIALLY_RECEIVED → receive 5 more → verify status RECEIVED
- [ ] **Over-Receiving:** Order 10 items → receive 12 → verify inventory shows 12
- [ ] **Receipt Confirmation:** Confirm receipt → verify cannot confirm again (idempotency)
- [ ] **Create Receipt (Standalone):** Create receipt without order → add items → confirm → verify inventory updated
- [ ] **Order Status Tracking:** Verify order shows remaining quantities after partial receive

#### **Inventory Workflows** (2-3 hours)
Based on senior dev's findings from Task 1:

- [ ] **View Inventory:** See all items with stock levels by location
- [ ] **Stock Adjustment:** Adjust +10 → verify quantity increased → check audit log created
- [ ] **Stock Adjustment (Negative):** Try to adjust below zero → verify error message
- [ ] **Stock Transfer:** Transfer between locations → verify source decreased, destination increased
- [ ] **Stock Count:** Create session → enter counts → complete → verify adjustments applied
- [ ] **Stock Count (Concurrency):** Create count → another user adjusts same item → complete count → verify conflict handled or override works

#### **Item-Supplier Linking** (1-2 hours)
Based on senior dev's findings from Task 6:

- [ ] **Add Item from Catalog:** Browse supplier catalog → add item → set default supplier → verify appears in My Items
- [ ] **View My Items:** Filter by supplier → verify filtering works
- [ ] **Low-Stock Filter:** Toggle low-stock filter → verify only shows items below reorder point
- [ ] **Default Supplier Usage:** Item with default supplier → quick reorder → verify supplier pre-selected

#### **Settings & Invites** (1-2 hours)

- [ ] **Practice Settings:** Update name, address → save → verify changes persist
- [ ] **Invite User:** Send invite to new email → verify email received
- [ ] **Change User Role:** STAFF → ADMIN → verify user has admin access
- [ ] **Remove User:** Remove user (not last admin) → verify user removed
- [ ] **Last Admin Protection:** Try to remove last admin → verify error prevents removal
- [ ] **Cancel Invite:** Cancel pending invite → verify cannot be accepted

---

### **B. UX Polish** (Low-Risk Improvements)

#### **Visual Improvements** (1-2 hours each)
- [ ] Add tooltip to stock adjustment form: "Enter change amount (e.g., +10 to add, -5 to remove)"
- [ ] Add banner when supplier has no email: "Order sent but email not configured. Download PO below."
- [ ] Improve low-stock badge visibility (brighter color, larger text)
- [ ] Add loading spinners to slow operations (send order, confirm receipt)
- [ ] Add confirmation dialog before deleting draft orders

#### **Email Template Polish** (2-3 hours)
**Note:** Senior dev implements basic template, you make it pretty.
- [ ] Add practice logo to email if available
- [ ] Improve styling (colors, fonts, layout)
- [ ] Test rendering in Gmail, Outlook, Apple Mail
- [ ] Add footer with practice contact info
- [ ] Make responsive for mobile viewing

#### **Validation Messages** (2-3 hours)
- [ ] Improve error messages for common mistakes:
  - "Cannot send empty order" → "Add at least one item before sending"
  - "Invalid input" → "Quantity must be a positive number"
- [ ] Add field-level validation hints (before submit)
- [ ] Ensure error messages don't leak sensitive info

#### **Help Text & Tooltips** (2-3 hours)
- [ ] Add "?" icons with explanations:
  - What is default supplier?
  - What is reorder point?
  - What happens when stock drops below reorder point?
- [ ] Add inline help for first-time users in onboarding
- [ ] Create simple FAQ page (markdown)

---

### **C. Documentation** (User-Facing)

#### **User Guide** (3-4 hours)
- [ ] Write step-by-step guide for common workflows:
  - Setting up your practice
  - Adding items and suppliers
  - Creating and sending orders
  - Receiving goods
  - Managing inventory
- [ ] Include screenshots of key screens
- [ ] Export as PDF or host as simple web page
- [ ] Share with pilot customers

#### **Troubleshooting Guide** (1-2 hours)
- [ ] Document common issues and solutions:
  - "Can't log in" → check password, check caps lock
  - "Order email not sent" → supplier missing email
  - "Can't complete stock count" → inventory changed, use admin override
- [ ] Include contact info for support

#### **Admin Setup Checklist** (1 hour)
- [ ] Document required environment variables
- [ ] First-time setup steps (create first user, add locations)
- [ ] Known limitations for pilot users
- [ ] Support contact information

---

### **D. Pre-Launch Regression Testing**

Create a master checklist and run through before each deployment:

#### **Quick Smoke Test** (30 minutes)
- [ ] Can log in
- [ ] Can create order
- [ ] Can send order
- [ ] Can receive goods
- [ ] Inventory updates correctly
- [ ] Can adjust stock
- [ ] No console errors in browser

#### **Full Regression Test** (2-3 hours)
Run through all test scenarios from Section A above before major releases.

---

## MVP Launch Checklist

### Before Pilot Launch

#### **Senior Dev: Code Review & Implementation**
- [ ] Transaction boundaries audited (Task 1)
- [ ] Tenant isolation & RBAC verified at code level (Task 2)
- [ ] Data integrity rules reviewed, missing constraints documented (Task 3)
- [ ] Order email sending implemented (Task 4)
- [ ] Receiving workflow logic verified (Task 5)
- [ ] Item-supplier linking audited (Task 6)
- [ ] Authentication edge cases reviewed (Task 7)
- [ ] Code review findings documented with file locations
- [ ] Recommendations provided for any issues found

#### **Founder: UI Testing & Validation**
- [ ] All authentication flows tested and working (Section 6A)
- [ ] Onboarding and redirect flows verified (Section 6A)
- [ ] Orders workflow tested end-to-end (Section 6A)
- [ ] Receiving workflow tested (partial, over-receiving, status updates) (Section 6A)
- [ ] Inventory operations tested (adjustments, transfers, counts) (Section 6A)
- [ ] Item-supplier linking tested (Section 6A)
- [ ] Settings and invites tested (Section 6A)
- [ ] All issues from senior dev code review verified as fixed

#### **Data Integrity (Senior Dev Verification)**
- [ ] Inventory updates use atomic operations (no read-modify-write)
- [ ] Receipt confirmation is idempotent (cannot confirm twice)
- [ ] Tenant isolation enforced at repository level
- [ ] RBAC checks present in all mutating service methods

#### **Email Sending (Senior Dev Implementation)**
- [ ] Email template function created and tested
- [ ] Email sending integrated into order workflow
- [ ] Timeout handling implemented (5 seconds)
- [ ] Graceful degradation for missing emails or API failures
- [ ] Tested with real Resend API in development

#### **UX & Polish (Founder)**
- [ ] Error messages helpful and non-technical
- [ ] Loading states for slow operations
- [ ] Confirmation dialogs for destructive actions
- [ ] Help text and tooltips where needed
- [ ] Email template looks professional

#### **Documentation (Founder)**
- [ ] User guide for pilot customers (workflows with screenshots)
- [ ] Troubleshooting guide (common issues and solutions)
- [ ] Admin setup checklist (env vars, first-time setup)
- [ ] Known limitations documented
- [ ] Support contact info provided

---

## Known MVP Limitations

**Document these for pilot users:**

1. **Email Delivery:** Best-effort only. If email fails, order is still sent. Users should verify supplier received order.

2. **Single Practice:** Users assumed to belong to one practice. Multi-practice switching not implemented.

3. **No Background Jobs:** All operations synchronous. Occasional slowness expected.

4. **Basic Rate Limiting:** In-memory fallback if Redis unavailable. Adequate for 1-3 users.

5. **Manual Testing:** No automated E2E tests yet. Regressions possible.

6. **Supplier Migration:** Template-based ordering has complex supplier mapping. May require manual verification.

7. **No File Uploads:** Product images, invoices, receipts not supported yet.

8. **Limited Reports:** Basic inventory and order lists only. No analytics or dashboards.

---

## Post-MVP Improvements (Future)

**Not needed for pilot launch, but good to document:**

- Job queue for email delivery (BullMQ)
- Automated testing (Playwright E2E tests)
- CI/CD pipeline (GitHub Actions)
- Complete supplier migration (remove legacy references)
- Database constraints (quantity >= 0)
- Multi-practice switcher UI
- File upload support (invoices, receipts)
- Advanced reports and analytics
- Audit log retention policy
- Advanced rate limiting (distributed, fail-closed)

---

## Contact & Support

**For questions during implementation:**
- Review architecture docs: `docs/architecture/ARCHITECTURE.md`
- Check operations guide: `docs/operations/OPS_RUNBOOK.md`
- Review test examples in `__tests__/` directories
- Contact solo founder for business logic clarification

**Estimated effort for senior dev:**
- Task 1 (Transaction boundaries): 4-6 hours
- Task 2 (Tenant isolation & RBAC): 4-5 hours
- Task 3 (Data integrity & constraints): 4-5 hours
- Task 4 (Email implementation): 4-6 hours
- Task 5 (Receiving workflow audit): 4-5 hours
- Task 6 (Item-supplier linking): 3-4 hours
- Task 7 (Authentication edge cases): 3-4 hours

**Total Senior Dev: 26-35 hours** (3-4 days full-time, or 1-2 weeks part-time)

**Estimated effort for founder:**
- Manual flow testing (Section 6A): 10-15 hours
- UX polish (Section 6B): 5-8 hours
- Documentation (Section 6C): 5-7 hours
- Pre-launch regression testing (Section 6D): 3-5 hours

**Total Founder: 23-35 hours** (3-5 days)

**Combined Timeline:** 2-3 weeks with parallel work

---

**MVP launch goal:** Pilot-ready Venzory for 1-3 medical practices to test core workflows and provide feedback for iteration.

**Responsibility Split:**
- **Senior Dev:** Architecture review, code correctness, implementation of email sending
- **Founder:** UI testing, UX polish, documentation, pilot customer support



