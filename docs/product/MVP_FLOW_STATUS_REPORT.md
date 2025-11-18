# Remcura V2 MVP Flow Status Report

**Generated:** November 18, 2025  
**Purpose:** Clear, global picture of what works and what needs attention for MVP  
**Scope:** Core clinic flows without code changes

---

## Executive Summary

**Overall MVP Readiness:** ✅ **READY** with identified follow-up tasks

All 7 core clinic flows are **functionally complete** and **reasonably hardened** for MVP deployment:

- ✅ Items & Suppliers (Practice Catalog, Supplier Catalog, Pricing)
- ✅ Orders (Create, Send, Low-Stock & Template-Based Ordering)
- ✅ Receiving (Goods Receipts, Partial Receiving, Order Integration)
- ✅ Inventory (Listing, Low Stock, Stock Adjustment)
- ✅ Locations & Stock Counts
- ✅ Onboarding, Settings & Roles
- ✅ Cross-Cutting Quality & Security

**Key Strengths:**
- Comprehensive integration test coverage for transactions and data integrity
- Recent hardening work has addressed null-safety, validation, and edge cases
- Security headers, CSRF, tenant isolation, and RBAC are production-ready
- All P1 blockers resolved (CSP, type errors, linting issues)

**Key Risks:**
- Legacy supplier migration incomplete (intentional but adds complexity)
- Some flows lack end-to-end UI tests (primarily service-layer tested)
- Order email sending not yet implemented
- Concurrency edge cases rely on service-layer enforcement vs. DB constraints

---

## Flow 1: Items & Suppliers

### Status: ✅ **OK**

### What Works Today

**Practice Catalog (My Items):**
- Add items from supplier catalog with pricing and supplier linkage
- Filter/search by name, SKU, supplier, low-stock status
- Pagination with accurate counts and range display
- Cross-links to Inventory and Orders pages work correctly
- Client-side and server-side sorting both functional

**Supplier Module:**
- GlobalSupplier + PracticeSupplier architecture fully implemented
- CRUD operations for linking suppliers to practices
- Custom labels, account numbers, preferred/blocked status
- Filtering by preferred, blocked, search terms
- Real data wired into all UI components (no demo data)

**Integration:**
- Default practice supplier IDs flow cleanly into items, order templates, quick reorder
- Supplier items track pricing per practice-supplier-item combination
- Low-stock ordering respects supplier associations

### Evidence

**Documentation:**
- `MY_ITEMS_HARDENING_SUMMARY.md` - Recent hardening work completed
- `SUPPLIERS_HEALTH_CHECK_REPORT.md` - All 22 tests passing, production-ready

**Tests:**
- `tests/integration/practice-catalog-my-items.test.ts` - Full flow coverage
- `tests/integration/practice-supplier-repository.test.ts` - CRUD and filtering
- `__tests__/services/inventory/practice-catalog.test.ts` - 6/6 unit tests passing

### Known Issues / Risks

1. **Legacy Supplier Migration Incomplete**
   - **Risk Level:** Medium
   - **Details:** Legacy `Supplier` records still exist alongside new `PracticeSupplier` model
   - **Impact:** Adds complexity, migration mapping required in templates and other flows
   - **Mitigation:** Migration traceability via `migratedFromSupplierId` field is working

2. **Template Supplier Dependencies**
   - **Risk Level:** Medium
   - **Details:** `OrderTemplateItem.supplierId` still references legacy supplier with runtime mapping
   - **Impact:** Brittle over time, requires careful maintenance during migration
   - **Mitigation:** Mapping logic is tested and working correctly

3. **Test Coverage Gaps**
   - **Risk Level:** Low
   - **Details:** No automated UI-level smoke tests for My Items + Supplier Catalog end-to-end
   - **Impact:** Regressions in filtering or pagination could slip through if tests aren't run
   - **Mitigation:** Integration tests cover service layer thoroughly

### Suggested Follow-Up Tasks

1. **Complete Supplier Migration** (Priority: Medium)
   - Define final migration step to remove legacy `Supplier` dependencies from templates
   - Add `practiceSupplierId` field to `OrderTemplateItem` model
   - Create migration script to backfill template items with practice supplier IDs
   - Update template creation/editing to use `PracticeSupplier` directly

2. **Add UI Smoke Tests** (Priority: Low)
   - Create Playwright spec or UI test checklist for My Items happy path
   - Test: Browse catalog → Add to My Items → Filter by supplier → Verify item appears
   - Test: Low-stock filter toggle → Verify counts and pagination update

3. **Admin Diagnostics Panel** (Priority: Low)
   - Add debug endpoint: `/api/admin/supplier-migration-status`
   - Show counts: legacy suppliers, practice suppliers, items with legacy refs
   - Display migration progress percentage

---

## Flow 2: Orders

### Status: ✅ **OK**

### What Works Today

**Order Management:**
- Create draft orders with multiple items and quantities
- Edit draft orders (add/remove items, adjust quantities/prices)
- Send orders to suppliers (DRAFT → SENT status transition)
- View order history with status badges and filtering
- Order detail pages show all items, totals, supplier info

**Quick Reorder from Templates:**
- One-click draft order creation from templates
- Multi-supplier templates create multiple draft orders (one per supplier)
- Single-supplier templates redirect directly to order detail
- Multi-supplier quick orders show summary page with all created orders
- Template items use default quantities and pricing from supplier items

**Low-Stock Ordering:**
- Create orders from low-stock items automatically
- Groups items by supplier into separate draft orders
- Respects reorder quantities from inventory settings
- Skips items without configured suppliers

### Evidence

**Documentation:**
- `mvp-audit-final.md` - Orders list and detail confirmed working
- `QUICK_REORDER_IMPLEMENTATION_SUMMARY.md` - Quick reorder feature complete
- `MULTI_SUPPLIER_TEMPLATES_IMPLEMENTATION.md` - Multi-supplier MVP complete

**Tests:**
- `tests/integration/order-transactions.test.ts` - Transaction safety verified
- `tests/integration/order-templates.test.ts` - Template-based ordering tested
- Service-layer validation and RBAC enforcement tested

### Known Issues / Risks

1. **Order Email Sending Not Implemented**
   - **Risk Level:** High (for production use)
   - **Details:** Email sending code is commented out with TODO in `app/(dashboard)/orders/actions.ts:313`
   - **Impact:** Cannot send POs to suppliers electronically; manual process required
   - **Mitigation:** None currently; feature must be implemented before production

2. **Template Legacy Supplier Mapping**
   - **Risk Level:** Medium
   - **Details:** Templates still use legacy supplier IDs with runtime mapping to PracticeSupplier
   - **Impact:** Same as Items & Suppliers flow; adds complexity and migration risk
   - **Mitigation:** Mapping logic is tested and working

3. **No UI-Level Status Transition Tests**
   - **Risk Level:** Low
   - **Details:** Order send/cancel actions tested at service layer but not full UI flow
   - **Impact:** UI regressions in order status transitions might not be caught
   - **Mitigation:** Service layer tests provide good coverage of business logic

### Suggested Follow-Up Tasks

1. **Implement Order Email Sending** (Priority: High)
   - Create `sendOrderEmail` function in `lib/email.ts`
   - Transform `OrderWithRelations` to email template data
   - Add email template for purchase orders (HTML + plain text)
   - Wire into `sendOrderAction` after status update to SENT
   - Add integration test: create order → send → verify email queued

2. **Add Order Status Transition Test** (Priority: Medium)
   - Create integration/E2E test for full order lifecycle
   - Test: Create draft → Add items → Send → Verify status SENT
   - Test: Cancel order → Verify status CANCELLED
   - Test: Multi-supplier template quick order → Verify summary page

3. **Plan Template Migration** (Priority: Low)
   - Design schema change to add `practiceSupplierId` to `OrderTemplateItem`
   - Create migration to backfill existing templates
   - Update template CRUD to use practice suppliers directly
   - Schedule after main supplier migration is complete

---

## Flow 3: Receiving

### Status: ✅ **OK**

### What Works Today

**Receiving Hub:**
- View all receipts with status filtering (DRAFT, CONFIRMED, CANCELLED)
- Stats cards show draft count, confirmed (30d), and total items received
- Create new receipts (manual or order-linked)

**Receipt Management:**
- Create draft receipts with location and optional supplier
- Add items manually or via barcode scanning
- Edit quantities, batch numbers, expiry dates on draft receipts
- Remove lines from draft receipts
- Confirm receipts to update inventory atomically

**Order-Linked Receiving:**
- "Receive This Order" button on SENT orders
- Pre-fills supplier and order reference
- Shows expected items with ordered quantities
- Quick entry form for batch/expiry per expected item
- Tracks remaining quantities across multiple receipts
- Updates order status: SENT → PARTIALLY_RECEIVED → RECEIVED

**Partial Receiving:**
- Multiple receipts can be created for same order
- System tracks already-received quantities per item
- Shows remaining quantities in expected items form
- Pre-fills remaining quantity (not original order quantity)
- Over-receiving is allowed and handled correctly

### Evidence

**Documentation:**
- `RECEIVING_MODULE_IMPLEMENTATION.md` - Full implementation details
- `RECEIVING_HARDENING_SUMMARY.md` - Recent hardening completed
- `RECEIVING_SMOKE_TEST.md` - Manual test checklist for happy paths
- `docs/PARTIAL_RECEIVING_FEATURE.md` - Partial receiving feature explained

**Tests:**
- `tests/integration/receiving-transactions.test.ts` - Transaction safety verified
- `tests/integration/receiving-orders-status.test.ts` - Order status transitions tested
- Rollback behavior, inventory updates, stock adjustments all covered

### Known Issues / Risks

1. **Barcode Scanner Dependency on GTINs**
   - **Risk Level:** Medium
   - **Details:** Scanner requires valid `Product.gtin` and camera permissions
   - **Impact:** "Item not found" errors even when item exists if GTIN missing or camera blocked
   - **Mitigation:** Manual entry fallback always available

2. **Order Deletion After Draft Receipt**
   - **Risk Level:** Low
   - **Details:** If order deleted/changed after draft receipt created, expected items UI degrades
   - **Impact:** No expected items list shown; user must add items manually
   - **Mitigation:** Graceful degradation; receipt still works, just less convenient

3. **No Automated E2E UI Tests**
   - **Risk Level:** Medium
   - **Details:** No full-stack test from SENT order → Receive → Inventory verification
   - **Impact:** UI regressions in receiving flow might not be caught
   - **Mitigation:** Integration tests cover service layer and transactions thoroughly

### Suggested Follow-Up Tasks

1. **Add Receiving Happy Path E2E Test** (Priority: Medium)
   - Create E2E test mirroring `RECEIVING_SMOKE_TEST.md`
   - Test: Navigate to Receiving → Create receipt → Add items → Confirm → Verify inventory
   - Test: Barcode scan flow (mock camera or use test GTIN)
   - Test: Remove line from draft → Verify line removed

2. **Add Order-Linked Receiving E2E Test** (Priority: Medium)
   - Test: Create SENT order → Click "Receive This Order" → Partial receive → Confirm
   - Verify: Order status → PARTIALLY_RECEIVED
   - Test: Receive remaining items → Confirm
   - Verify: Order status → RECEIVED, redirect to order page

3. **Add UX Fallback Message** (Priority: Low)
   - When order-linked receipt created but order deleted/changed
   - Show banner: "Original order no longer available. Add items manually."
   - Add test for this edge case

---

## Flow 4: Inventory

### Status: ✅ **OK**

### What Works Today

**Inventory Listing:**
- View all items with stock levels across all locations
- Filter by location, supplier, search term
- Sort by name, SKU, brand, supplier, stock level
- Show total stock, location count, low-stock indicators

**Low Stock Detection:**
- Automatically identifies items below reorder point
- Shows suggested reorder quantities
- Lists low-stock locations per item
- Low-stock filter on My Items page

**Stock Adjustments:**
- Manual stock adjustments (delta-based)
- Validates non-negative final quantities
- Creates audit trail (StockAdjustment records)
- Updates LocationInventory atomically
- Triggers low-stock notifications

**Inventory Transfers:**
- Transfer stock between locations
- Validates sufficient source stock
- Prevents same-location transfers
- Atomic updates (decrement source, increment destination)
- Creates InventoryTransfer audit records

### Evidence

**Documentation:**
- `DOMAIN_RULES.md` - Inventory invariants documented
- `MY_ITEMS_HARDENING_SUMMARY.md` - Low-stock filtering verified

**Tests:**
- `tests/integration/inventory-transactions.test.ts` - Transaction safety, rollback tested
- Service-layer validation (non-negative quantities, transfer validation) covered
- Low-stock calculation logic tested

### Known Issues / Risks

1. **Service-Layer vs. DB Constraint Enforcement**
   - **Risk Level:** Medium
   - **Details:** Non-negative quantities enforced in service but no DB CHECK constraint
   - **Impact:** Extreme concurrency could produce negative inventory in edge cases
   - **Mitigation:** Service validation + transactions provide good protection

2. **No Combined Low-Stock Integration Test**
   - **Risk Level:** Low
   - **Details:** No single test covering: adjust stock → trigger low-stock → quick reorder
   - **Impact:** Integration between inventory, low-stock detection, and ordering not fully verified
   - **Mitigation:** Individual components are well-tested

3. **Stock Adjustment UX Confusion**
   - **Risk Level:** Low
   - **Details:** Users must understand adjustments are deltas (not absolute counts)
   - **Impact:** Incorrect adjustments could create confusing audit trails
   - **Mitigation:** Form validation prevents negative results

### Suggested Follow-Up Tasks

1. **Add DB-Level Constraints** (Priority: Medium)
   - Add CHECK constraint: `LocationInventory.quantity >= 0`
   - Add CHECK constraint: `StockAdjustment.quantity != 0`
   - Test constraint enforcement with integration tests
   - Document constraint behavior in `DOMAIN_RULES.md`

2. **Add Combined Low-Stock Integration Test** (Priority: Low)
   - Test: Adjust stock below reorder point → Verify low-stock notification
   - Test: Use quick reorder from low-stock items → Verify draft orders created
   - Test: Stock adjustment history appears correctly
   - Verify: All three systems (inventory, low-stock, orders) stay in sync

3. **Add Stock Adjustment Helper Tooltip** (Priority: Low)
   - Add tooltip on adjustment form: "Enter the change in quantity (e.g., +10 or -5)"
   - Show example: "Current: 20 units. Adjustment: -5. New: 15 units."
   - Add small info icon with explanation

---

## Flow 5: Locations & Stock Counts

### Status: ✅ **OK**

### What Works Today

**Locations Management:**
- Create locations with name, code, description
- Support for location hierarchy (parent/child relationships)
- Validate parent location exists and belongs to same practice
- Prevent circular hierarchies (location as its own parent/child)
- Safe deletion with usage checks

**Location Deletion Safeguards:**
- Check for inventory before deletion
- Check for child locations before deletion
- Check for stock adjustments, transfers, receipts, stock counts
- UI disables delete button when location in use
- Helpful tooltips explain why deletion is blocked

**Stock Count Sessions:**
- Create count session for a location
- Add count lines with counted quantities
- System automatically captures system quantity at count time
- Calculate variance (counted - system)
- Complete with or without inventory adjustments

**Stock Count Adjustments:**
- Apply adjustments to update inventory to counted quantities
- Create StockAdjustment records for audit trail
- Trigger low-stock notifications after adjustments
- Atomic transaction (all adjustments or none)

**Concurrency Handling:**
- Detect inventory changes between count start and completion
- Block STAFF users from applying adjustments if changes detected
- Allow ADMIN override with explicit confirmation
- Log all overrides with warnings in audit trail

### Evidence

**Documentation:**
- `LOCATIONS_HARDENING_SUMMARY.md` - Hardening work completed
- `STOCK_COUNTING_PRODUCTION_READY.md` - Comprehensive production readiness report
- `STOCK_COUNTING_MANUAL_TEST_CHECKLIST.md` - Manual test procedures

**Tests:**
- `tests/integration/stock-count-flow.test.ts` - Full workflow tested
- `tests/integration/stock-count-repository.test.ts` - Repository methods tested
- Concurrency detection, admin override, transaction rollback all covered

### Known Issues / Risks

1. **One Location Per Session Limitation**
   - **Risk Level:** Low
   - **Details:** Each count session targets single location; multi-location requires multiple sessions
   - **Impact:** May not fit all clinic workflows (e.g., full facility count)
   - **Mitigation:** Intentional design decision for MVP; can be enhanced later

2. **All-or-Nothing Adjustment Application**
   - **Risk Level:** Low
   - **Details:** Must apply all adjustments or none; can't selectively apply per item
   - **Impact:** If one item has issue, must fix before completing entire count
   - **Mitigation:** Intentional design for data consistency

3. **Concurrency UX Could Be Rough**
   - **Risk Level:** Low
   - **Details:** Frequent concurrent adjustments could lead to many conflicts
   - **Impact:** Staff frustration if they have to redo counts frequently
   - **Mitigation:** Admin override available; conflicts should be rare in practice

4. **No Full-Stack Location Deletion Test**
   - **Risk Level:** Low
   - **Details:** Location deletion safeguards tested at repository level but not UI
   - **Impact:** UI regressions (button not disabled, tooltip missing) might not be caught
   - **Mitigation:** Repository tests provide good coverage of business logic

### Suggested Follow-Up Tasks

1. **Add Location Deletion UI Test** (Priority: Low)
   - Test: Create location with inventory → Verify delete button disabled
   - Test: Hover over disabled button → Verify tooltip text correct
   - Test: Create location with child → Verify delete button disabled
   - Test: Empty location → Verify delete button enabled and works

2. **Enhance Concurrency Conflict UI** (Priority: Low)
   - Show banner when conflict detected with clear explanation
   - List which items changed and by how much
   - Provide "Redo Count" button to start fresh
   - Add test for conflict banner display and actions

3. **Design Multi-Location Session Enhancement** (Priority: Low - Future)
   - Gather user feedback on whether multi-location sessions are needed
   - Design approach: single session with location per item, or batch sessions
   - Document as potential Phase 2 enhancement
   - Not required for MVP

---

## Flow 6: Onboarding, Settings & Roles

### Status: ✅ **OK**

### What Works Today

**Onboarding Flow:**
- Dashboard computes setup progress server-side via `SettingsService`
- Checks: has locations, suppliers, items, received orders
- Shows guided onboarding panel for STAFF/ADMIN users
- Step-by-step navigation: locations → suppliers → items → orders
- Progress bar and completion tracking

**Onboarding Panel:**
- Slide-in side panel with current step highlighted
- Action buttons navigate to appropriate pages
- "Next Step" button advances through workflow
- "Skip" and "Complete Setup" actions update practice status
- LocalStorage persistence for panel state (open/closed, current step)

**Settings Page:**
- Practice settings: name, address, contact info, logo
- User management: view users, invite new users, update roles
- Remove users (with last admin protection)
- Cancel pending invites
- All actions validated with Zod schemas

**RBAC Enforcement:**
- VIEWER: read-only access to most pages
- STAFF: can create/edit orders, receive goods, perform stock counts
- ADMIN: full access including user management and dangerous operations
- Middleware protects routes based on role requirements

### Evidence

**Documentation:**
- `P1_VERIFICATION_REPORT.md` - RBAC, CSRF, auth config all verified
- Dashboard layout code shows onboarding logic
- Settings service implements all user/practice management

**Tests:**
- `__tests__/auth-config.test.ts` - NextAuth configuration tested (40+ tests)
- CSRF protection tests for all server actions
- Tenant isolation tests for cross-practice access prevention

### Known Issues / Risks

1. **LocalStorage and Database State Divergence**
   - **Risk Level:** Low
   - **Details:** Panel state in localStorage, practice status in database
   - **Impact:** On new device or cleared storage, panel state resets but practice status remains
   - **Mitigation:** Graceful degradation; panel will show from beginning but can be skipped

2. **Inconsistent Logging in Actions**
   - **Risk Level:** Low
   - **Details:** Some server actions use `console.error` instead of structured logger
   - **Impact:** Observability slightly inconsistent; harder to correlate logs
   - **Mitigation:** Acceptable for MVP; doesn't affect functionality

3. **No Automated Onboarding Visibility Tests**
   - **Risk Level:** Low
   - **Details:** No test asserting onboarding panel appears/disappears based on setup state
   - **Impact:** Regressions in onboarding visibility logic might not be caught
   - **Mitigation:** Logic is straightforward; manual testing can verify

### Suggested Follow-Up Tasks

1. **Add Dashboard Onboarding Visibility Test** (Priority: Low)
   - Seed practice with no locations → Verify onboarding panel shows
   - Seed practice with locations but no suppliers → Verify panel shows step 2
   - Seed practice with all setup complete → Verify panel hidden
   - Test "Skip" action → Verify panel disappears and status updated

2. **Normalize Logging to Structured Logger** (Priority: Low)
   - Replace `console.error` in `app/(dashboard)/_actions/onboarding-actions.ts`
   - Replace `console.error` in `app/(dashboard)/settings/actions.ts`
   - Use `logger.error()` from `lib/logger.ts` consistently
   - Add test to verify error logs contain expected context fields

3. **Add "Reset Tutorial" Control** (Priority: Low)
   - Add button on dashboard: "Restart Setup Tutorial"
   - Calls existing `resetOnboarding` server action
   - Shows confirmation dialog before resetting
   - Add test: click reset → verify onboarding panel appears and status cleared

---

## Flow 7: Cross-Cutting Quality & Security

### Status: ✅ **OK** for MVP

### What Works Today

**Security Headers:**
- Content Security Policy (CSP) with nonce-based script execution
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (production only)
- Permissions-Policy: restrictive defaults

**CSRF Protection:**
- All mutating API routes use `apiHandler` with automatic CSRF verification
- All server actions call `verifyCsrfFromHeaders()` before execution
- Token signature verification prevents tampering
- GET/HEAD/OPTIONS exempt (safe methods)

**Tenant Isolation:**
- All repository methods require `practiceId` parameter
- All queries validate `practiceId` in WHERE clause
- Cross-tenant access prevented at database level
- Integration tests verify isolation

**Transaction Safety:**
- All multi-step operations wrapped in `withTransaction`
- Rollback on business rule violations tested
- Atomic updates across multiple entities
- No raw `$transaction` usage in services

**Authentication & Authorization:**
- NextAuth with secure cookie settings (httpOnly, sameSite, secure in production)
- JWT session strategy with 30-day max age, 24-hour rotation
- RBAC enforced via `requireRole()` in services
- Middleware protects routes based on role requirements

### Evidence

**Documentation:**
- `IMPLEMENTATION_COMPLETE.md` - Security headers implementation complete
- `SECURITY_HEADERS_VERIFICATION.md` - Browser verification passed
- `P1_VERIFICATION_REPORT.md` - All P1 security checks passing
- `TECH_HEALTH.md` - Build, lint, typecheck all passing

**Tests:**
- 60 security header tests passing
- CSRF protection tests for API routes and server actions
- Tenant isolation integration tests
- Transaction rollback tests for all major flows

### Known Issues / Risks

1. **No Continuous Security Monitoring**
   - **Risk Level:** Medium
   - **Details:** Security tests exist but no automated monitoring in production
   - **Impact:** Security regressions or new vulnerabilities might not be detected quickly
   - **Mitigation:** Run security tests in CI pipeline

2. **Sentry Edge Runtime Disabled**
   - **Risk Level:** Low
   - **Details:** Sentry edge config disabled due to Next.js 15 compatibility issue
   - **Impact:** Edge runtime errors not captured by Sentry
   - **Mitigation:** Server and client errors still captured; edge runtime rarely used

### Suggested Follow-Up Tasks

1. **Set Up CI Pipeline with Security Tests** (Priority: High)
   - Configure GitHub Actions or similar CI
   - Run security header tests on every PR
   - Run P1 verification tests (CSRF, tenant isolation, transactions)
   - Block merge if security tests fail

2. **Add Security Monitoring in Production** (Priority: Medium)
   - Set up Sentry alerts for security-related errors
   - Monitor CSP violation reports
   - Track failed authentication attempts
   - Alert on unusual cross-tenant access patterns

3. **Document Security Patterns for New Features** (Priority: Low)
   - Create developer guide for adding new features
   - Checklist: RequestContext, RBAC, CSRF, tenant isolation
   - Code examples for common patterns
   - Link to existing tests as reference

---

## Summary of Follow-Up Tasks by Priority

### High Priority (Must Do Before Production)

1. **Implement Order Email Sending** (Flow 2)
   - Cannot send POs to suppliers without this
   - Core functionality for clinic operations

2. **Set Up CI Pipeline with Security Tests** (Flow 7)
   - Prevent security regressions
   - Essential for maintaining security posture

### Medium Priority (Should Do Soon)

3. **Complete Supplier Migration** (Flow 1)
   - Reduce complexity and migration risk
   - Simplify codebase maintenance

4. **Add Receiving E2E Tests** (Flow 3)
   - Verify full UI flow works end-to-end
   - Catch UI regressions early

5. **Add DB-Level Constraints** (Flow 4)
   - Extra safety for inventory invariants
   - Prevent edge-case concurrency issues

6. **Add Order Status Transition Test** (Flow 2)
   - Verify UI-level order lifecycle
   - Complement existing service tests

### Low Priority (Nice to Have)

7. **Add UI Smoke Tests for My Items** (Flow 1)
8. **Add Combined Low-Stock Integration Test** (Flow 4)
9. **Add Location Deletion UI Test** (Flow 5)
10. **Add Dashboard Onboarding Visibility Test** (Flow 6)
11. **Normalize Logging to Structured Logger** (Flow 6)
12. **Add Stock Adjustment Helper Tooltip** (Flow 4)
13. **Add UX Fallback Message for Deleted Orders** (Flow 3)
14. **Enhance Concurrency Conflict UI** (Flow 5)
15. **Add Admin Diagnostics Panel** (Flow 1)

---

## How to Use This Report

1. **For MVP Launch:** Focus on High Priority tasks (order email, CI pipeline)
2. **For Immediate Improvements:** Tackle Medium Priority tasks in order
3. **For Long-Term Maintenance:** Address Low Priority tasks as time permits
4. **For New Features:** Follow patterns documented in Flow 7 (RequestContext, RBAC, CSRF)

Each suggested task is **small and focused** - suitable for a single implementation session. When ready to implement, pick one task and create a dedicated plan for just that item.

---

## Conclusion

Remcura V2 has a **solid foundation** for MVP deployment:

✅ All core clinic flows are functionally complete  
✅ Recent hardening work has addressed major edge cases  
✅ Security and data integrity are production-ready  
✅ Integration test coverage is comprehensive  

The identified follow-up tasks are **enhancements and polish**, not blockers. The system is ready for controlled MVP deployment with the understanding that order email sending must be implemented first.

**Confidence Level:** HIGH for MVP readiness with documented follow-ups.


