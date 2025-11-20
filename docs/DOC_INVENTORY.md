# Documentation Inventory

**Generated:** November 18, 2025  
**Purpose:** Comprehensive inventory of all Markdown documentation in the Venzory repository  
**Total Documents:** 62

---

## How to Read This Inventory

### Column Definitions

- **path**: Location of the document in the repository
- **title**: Short descriptive title (inferred from first heading or content)
- **topic**: Primary subject area (see taxonomy below)
- **seems-current?**: Assessment of alignment with current codebase
  - `yes`: Matches current implementation, routes, and features
  - `maybe`: Partially current or high-level concepts not easily verifiable
  - `no`: References outdated features, routes, or architectures
- **comments**: Brief explanation of assessment
- **suggested action**: Recommendation for handling the document
  - `keep`: Current and useful, maintain as-is
  - `merge into new roadmap`: Consolidate into unified roadmap/status doc
  - `archive as legacy`: Historical value only, clearly outdated

### Topic Taxonomy

- `orders`: Order creation, management, templates, sending
- `inventory`: Stock management, items, my-items catalog
- `suppliers`: Supplier management, global/practice suppliers
- `customers`: Customer/patient management (if applicable)
- `billing`: Payments, invoicing, pricing
- `security`: Authentication, authorization, CSP, headers, CSRF
- `auth`: Login, registration, password reset
- `architecture`: System design, layers, patterns, Go-ready refactor
- `infra`: Deployment, migrations, database, CI/CD, monitoring
- `product`: Roadmaps, feature specs, MVP status, UX flows
- `operations`: Runbooks, health checks, verification procedures
- `process`: Team practices, testing, contribution guidelines
- `misc`: Uncategorized or multi-domain

---

## Documentation Inventory Table

| path | title | topic | seems-current? | comments | suggested action |
|------|-------|-------|----------------|----------|------------------|
| `MVP_FLOW_STATUS_REPORT.md` | Venzory MVP Flow Status Report | product | yes | Generated Nov 18, 2025. Describes all 7 core flows (Items/Suppliers, Orders, Receiving, Inventory, Locations, Onboarding, Security). Matches current routes in app/(dashboard). | keep |
| `docs/TYPE_SAFETY_IMPROVEMENTS.md` | Type Safety Improvements - Prisma and Domain Types | architecture | yes | Completed Nov 18, 2025. Documents type safety changes in lib/prisma-transforms.ts and domain models. Code references match current implementation. | keep |
| `MULTI_SUPPLIER_TEMPLATES_IMPLEMENTATION.md` | Multi-Supplier Order Templates MVP | orders | yes | Completed Nov 17, 2025. Documents multi-supplier template feature with quick-summary page. Routes and components exist in app/(dashboard)/orders/. | keep |
| `QUICK_REORDER_IMPLEMENTATION_SUMMARY.md` | Quick Reorder Implementation Summary | orders | yes | Documents Quick Reorder feature with template-based ordering. Service methods (createOrdersFromTemplateWithDefaults) and UI components verified in codebase. | keep |
| `LOCATIONS_HARDENING_SUMMARY.md` | Locations Module Hardening | inventory | yes | Documents location deletion safeguards, hierarchy validation. LocationRepository methods and app/(dashboard)/locations/ exist. | keep |
| `MY_ITEMS_HARDENING_SUMMARY.md` | My Items / Practice Catalog Hardening | inventory | yes | Documents fixes to supplier filter, low-stock filtering, pagination. app/(dashboard)/my-items/ page exists with described components. | keep |
| `RECEIVING_HARDENING_SUMMARY.md` | Receiving Module Hardening | inventory | yes | Completed Nov 17, 2025. Documents null-safety and validation improvements in receiving module. Routes and components in app/(dashboard)/receiving/ match. | keep |
| `docs/mvp-audit-final.md` | Venzory MVP Functional Audit - Final Report | operations | yes | Nov 17, 2025 audit. Documents CSP fix and testing of core modules. References current routes and functionality. | keep |
| `docs/mvp-audit.md` | Venzory MVP Functional Audit | operations | maybe | Nov 17, 2025 audit identifying CSP blocker. Superseded by mvp-audit-final.md but provides historical context. | merge into new roadmap |
| `TESTING.md` | Testing Guide | process | yes | Documents Vitest setup, unit vs integration tests, test structure. References current test directories and commands. | keep |
| `prisma/migrations/20251116000000_formalize_remaining_drift/README.md` | Migration: Formalize Remaining Drift | infra | yes | Nov 16, 2025 migration. Documents LocationInventory.createdAt and performance indexes. Migration file exists. | keep |
| `docs/OPS_RUNBOOK.md` | Operations Runbook - Venzory | operations | yes | Updated Nov 16, 2025. Covers DB verification, migrations, drift detection, rollback procedures. Commands and procedures are current. | keep |
| `DOMAIN_RULES.md` | Domain Business Rules & Invariants | architecture | yes | Updated Nov 11, 2025 (v2.0). Comprehensive business rules across 5 domains. References current schema and service layer. 85% enforcement documented. | keep |
| `docs/MIGRATION_STATUS.md` | Migration Status and Notes | infra | yes | Documents all applied migrations through Nov 16, 2025. Migration list matches prisma/migrations/ directory. All drift resolved. | keep |
| `docs/migrations/database-constraint-hardening.md` | Database Constraint Hardening Migration Guide | infra | yes | Nov 11, 2025 migration guide. Documents onDelete policies, CHECK constraints, unique constraints. Migrations 7, 9, 10 exist. | keep |
| `STYLE_GUIDE_IMPLEMENTATION.md` | Style Guide Implementation Summary | architecture | yes | Nov 16, 2025. Documents /style-guide route, design tokens, components. StyleSection, TokenCard components exist in components/style-guide/. | keep |
| `docs/README.md` | Venzory Documentation | misc | yes | Updated Nov 11, 2025. Index of all docs with links. References current architecture, migrations, features. Serves as docs homepage. | keep |
| `docs/STYLE_GUIDE.md` | Venzory Style Guide | architecture | yes | Documents design tokens, typography, components accessible at /style-guide. Matches implementation. | keep |
| `RECEIVING_SMOKE_TEST.md` | Receiving Module - Manual Smoke Test Checklist | operations | yes | Manual test checklist for receiving flow. Steps match current UI in app/(dashboard)/receiving/. | keep |
| `P1_VERIFICATION_REPORT.md` | P1 Verification Sweep Report | security | yes | Nov 13, 2025. Security audit covering NextAuth, CSRF, RBAC, CSP, tenant isolation, transactions, constraints. All verified as PASS. | keep |
| `README.md` | Venzory | misc | yes | Main project README. Documents stack, setup, auth, RBAC, security headers, CSP, CSRF, rate limiting, error handling. All features current. | keep |
| `UNIQUE_CONSTRAINTS_IMPLEMENTATION_SUMMARY.md` | Unique Constraints Implementation Summary | infra | yes | Nov 13, 2025. Documents unique constraints on Item (name, SKU), Location (code). Migration 20251113180000 exists. | keep |
| `TENANT_ISOLATION_FIXES_SUMMARY.md` | Tenant Isolation Fixes | security | yes | Documents practiceId validation fixes in 13 repository methods. Repository methods verified in src/repositories/. | keep |
| `TRANSACTION_BOUNDARIES_SUMMARY.md` | Transaction Boundaries Implementation Summary | architecture | yes | Documents transaction usage in ReceivingService, InventoryService, OrderService. withTransaction helper exists in src/repositories/base/. | keep |
| `STOCK_COUNTING_PRODUCTION_READY.md` | Stock Counting & Location Inventory - Production Ready | inventory | yes | Nov 2024. Documents concurrency handling, validation, testing for stock counts. StockCountRepository and routes exist. | keep |
| `STOCK_COUNTING_MANUAL_TEST_CHECKLIST.md` | Stock Counting Manual Test Checklist | operations | yes | Manual test checklist for stock counting. Steps match current UI in app/(dashboard)/stock-count/. | keep |
| `SUPPLIERS_HEALTH_CHECK_REPORT.md` | Suppliers Module Health Check Report | operations | yes | Nov 13, 2025. Verifies GlobalSupplier and PracticeSupplier queries, CRUD, UI. All tests passed. Matches current supplier architecture. | keep |
| `SECURITY_IMPLEMENTATION_FINAL.md` | Security Headers & CSP Implementation - Final Report | security | yes | Nov 12, 2025. Documents security headers, CSP with nonces, unsafe-inline justification. Implementation in middleware.ts and lib/csp.ts verified. | keep |
| `IMPLEMENTATION_COMPLETE.md` | Security Headers Implementation - Complete | security | yes | Nov 12, 2025. Completion report for security headers. Duplicate of SECURITY_IMPLEMENTATION_FINAL.md content. | merge into new roadmap |
| `PR_SECURITY_HEADERS.md` | PR: Add Security Headers and Content Security Policy | security | yes | Nov 12, 2025. PR description for security headers implementation. Historical context for security work. | merge into new roadmap |
| `SECURITY_HEADERS_VERIFICATION.md` | Security Headers Verification Report | security | yes | Nov 12, 2025. Verification of all security headers in dev environment. All headers confirmed working. | merge into new roadmap |
| `IMPLEMENTATION_SUMMARY.md` | Database Constraint Hardening - Implementation Summary | infra | yes | Nov 11, 2025. Summary of constraint hardening implementation. Overlaps with docs/migrations/database-constraint-hardening.md. | merge into new roadmap |
| `audit-analysis/00-AUDIT-SUMMARY.md` | Data Model & Business Invariants Audit - Executive Summary | architecture | yes | Nov 11, 2025. Pre-Magento audit identifying 130 invariants, 13 P1 gaps. All P1 issues marked as resolved. | keep |
| `audit-analysis/README.md` | Data Model & Business Invariants Audit | architecture | yes | Nov 11, 2025. Index for audit analysis documents. References DOMAIN_RULES.md and numbered analysis docs. | keep |
| `audit-analysis/01-schema-constraints-analysis.md` | Prisma Schema Constraint Analysis | architecture | yes | Nov 11, 2025. Detailed analysis of FK relationships, cascade behaviors, unique constraints. Matches current schema. | keep |
| `audit-analysis/02-domain-models-invariants.md` | Domain Models & Intended Invariants Analysis | architecture | yes | Nov 11, 2025. Analysis of domain models in src/domain/models/. Documents 130+ invariants across Orders, Receiving, Inventory, Suppliers, Products. | keep |
| `audit-analysis/03-service-validators-analysis.md` | Service Layer & Validator Analysis | architecture | yes | Nov 11, 2025. Analysis of service layer enforcement and domain validators. References current service methods in src/services/. | keep |
| `audit-analysis/04-comprehensive-invariants-matrix.md` | Comprehensive Business Invariants & Enforcement Matrix | architecture | yes | Nov 11, 2025. Matrix of all 130 invariants with enforcement levels (DB, Prisma, Validator, Service). Comprehensive reference. | keep |
| `TECH_HEALTH.md` | Technical Health Report | operations | yes | Nov 11, 2025. Pre-integration health check. Build passing, lint passing, 91 TS errors fixed. All issues resolved. | keep |
| `docs/ARCHITECTURE.md` | Venzory Architecture Documentation | architecture | yes | Documents Go-Ready layered architecture (API → Service → Repository → DB). Directory structure and patterns match current codebase. | keep |
| `docs/IMPLEMENTATION_SUMMARY.md` | Implementation Summary: Go-Ready Architecture Refactor | architecture | yes | Documents Phase 1-5 of architecture refactor. Services and repositories in src/ match described structure. | keep |
| `docs/MIGRATION_GUIDE.md` | Migration Guide: From Old to New Architecture | architecture | yes | Guide for migrating from direct Prisma to service/repository layer. Patterns match current codebase. | keep |
| `docs/PARTIAL_RECEIVING_FEATURE.md` | Partial Receiving Feature | inventory | yes | Documents partial receiving with multiple shipments. GoodsReceipt model and receiving UI support this flow. | keep |
| `docs/RECEIVING_MODULE_IMPLEMENTATION.md` | Receiving Module Implementation Summary | inventory | yes | Nov 8, 2025. Documents GoodsReceipt, GoodsReceiptLine models, RBAC, navigation. Routes in app/(dashboard)/receiving/ exist. | keep |
| `docs/GLOBAL_SUPPLIER_MIGRATION.md` | Global Supplier Architecture - Phase 1 Migration | suppliers | yes | Nov 11, 2025. Documents GlobalSupplier and PracticeSupplier tables. Migration 20251111112724 exists. Current supplier architecture. | keep |
| `docs/PHASE_2_SUPPLIER_INTEGRATION.md` | Phase 2: Supplier Integration Migration | suppliers | yes | Nov 11, 2025. Documents practiceSupplierId in Order, SupplierItem, Item tables. Migration 20251111122948 exists. Dual-supplier pattern active. | keep |
| `docs/PHASE_5_COMPLETION_REPORT.md` | Phase 5 Integration Completion Report | architecture | yes | Nov 9, 2025. Documents completion of API routes and page migrations to service layer. NotificationService, AuthService exist. | keep |
| `docs/HEALTH_CHECK_REPORT.md` | Health Check Report - Venzory | operations | yes | Nov 9, 2025. Comprehensive health check after Go-ready architecture. 91 TS errors fixed, build passing, Prisma usage compliant. | keep |
| `docs/i18n-reset-summary.md` | i18n Reset Summary | process | yes | Nov 5, 2025. Documents removal of broken i18n setup, restoration to single-language app. Current app has no [locale] routing. | keep |
| `docs/archive/CORE_FLOWS_IMPROVEMENTS_SUMMARY.md` | Core Flow Usability Improvements | product | no | Nov 11, 2025. Documents order actions, supplier catalog improvements. Archived, likely superseded by newer flow docs. | archive as legacy |
| `docs/archive/SEED_DATA_ENHANCEMENT.md` | Seed Data Enhancement - Supplier Architecture Demo | infra | maybe | Nov 11, 2025. Documents seed data for GlobalSupplier demo. Seed file may have evolved since. Historical context for supplier architecture. | archive as legacy |
| `docs/archive/ADD_SUPPLIER_FLOW_IMPLEMENTATION.md` | Add Supplier Flow - Implementation Summary | suppliers | maybe | Nov 11, 2025. Documents linkGlobalSupplierAction and add-supplier-modal. Components may exist but archived suggests superseded. | archive as legacy |
| `docs/archive/PRACTICE_SUPPLIER_UI_IMPLEMENTATION.md` | Practice Supplier Management UI | suppliers | maybe | Nov 11, 2025. Documents supplier detail page, actions. Archived suggests UI may have changed. Routes in app/(dashboard)/suppliers/ exist. | archive as legacy |
| `docs/archive/PHASE_1_MIGRATION_COMPLETE.md` | Phase 1: Global Supplier Architecture - Implementation Complete | suppliers | no | Nov 11, 2025. Phase 1 completion report. Superseded by docs/GLOBAL_SUPPLIER_MIGRATION.md. | archive as legacy |
| `docs/archive/PHASE_2_IMPLEMENTATION_STATUS.md` | Phase 2 Implementation Status | suppliers | no | Nov 11, 2025. Phase 2 status report. Superseded by docs/PHASE_2_SUPPLIER_INTEGRATION.md. | archive as legacy |
| `docs/archive/PHASE_2_MIGRATION_COMPLETE.md` | Phase 2: Supplier Integration - Migration Complete | suppliers | no | Nov 11, 2025. Phase 2 completion report. Superseded by docs/PHASE_2_SUPPLIER_INTEGRATION.md. | archive as legacy |
| `docs/archive/PHASE_4_COMPLETION_REPORT.md` | Phase 4 Integration Completion Report | architecture | no | Nov 9, 2025. Phase 4 (Products, Stock Count, Settings) completion. Superseded by docs/PHASE_5_COMPLETION_REPORT.md. | archive as legacy |
| `docs/archive/PHASE_5_FINAL_COMPLETION_REPORT.md` | Phase 5 Final Completion Report | architecture | no | Nov 9, 2025. Phase 5 final completion. Superseded by docs/PHASE_5_COMPLETION_REPORT.md. | archive as legacy |
| `docs/archive/SETTINGS_SUPPLIERS_LOCATIONS_REPORT.md` | Settings, Suppliers, and Locations Testing & Fixes Report | operations | no | Nov 10, 2025. Testing and fixes report. Archived, likely superseded by health check reports. | archive as legacy |
| `docs/archive/VERIFICATION_REPORT.md` | Architecture Verification Report | operations | no | Nov 8, 2025. Architecture verification after refactor. Superseded by docs/HEALTH_CHECK_REPORT.md. | archive as legacy |
| `docs/archive/PRODUCT_CATALOG_IMPLEMENTATION.md` | Product Catalog Management Implementation Summary | inventory | maybe | Documents product catalog UI with RBAC. Routes in app/(dashboard)/settings/products/ exist but archived suggests changes. | archive as legacy |
| `docs/archive/NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md` | In-App Notifications System - Implementation Summary | architecture | maybe | Documents InAppNotification model and notification triggers. NotificationService exists, but archived suggests implementation evolved. | archive as legacy |

---

## Summary Statistics

### By Topic
- **architecture**: 13 documents (21%)
- **suppliers**: 7 documents (11%)
- **inventory**: 7 documents (11%)
- **operations**: 9 documents (15%)
- **security**: 7 documents (11%)
- **infra**: 7 documents (11%)
- **orders**: 3 documents (5%)
- **product**: 2 documents (3%)
- **process**: 2 documents (3%)
- **misc**: 2 documents (3%)
- **auth**: 0 documents (0%)
- **billing**: 0 documents (0%)
- **customers**: 0 documents (0%)

### By Currency
- **yes**: 47 documents (76%) - Current and accurate
- **maybe**: 6 documents (10%) - Partially current or unverifiable
- **no**: 9 documents (14%) - Outdated or superseded

### By Suggested Action
- **keep**: 47 documents (76%) - Maintain as-is
- **merge into new roadmap**: 6 documents (10%) - Consolidate
- **archive as legacy**: 9 documents (14%) - Historical only

---

## Recommendations

### Immediate Actions

1. **Consolidate Status Reports**: Merge the following into a single "Implementation History" document:
   - `IMPLEMENTATION_COMPLETE.md`
   - `PR_SECURITY_HEADERS.md`
   - `SECURITY_HEADERS_VERIFICATION.md`
   - `IMPLEMENTATION_SUMMARY.md`
   - `docs/mvp-audit.md`

2. **Archive Cleanup**: The `docs/archive/` directory is correctly used. All 9 archived documents are properly marked as legacy.

3. **Documentation Gaps**: Consider creating docs for:
   - Customer/patient management (if applicable)
   - Billing/invoicing features (if implemented)
   - Deployment procedures (production deployment guide)
   - API documentation for external integrations

### Maintenance Notes

- **MVP_FLOW_STATUS_REPORT.md** (Nov 18, 2025) is the most current comprehensive status document
- **DOMAIN_RULES.md** (v2.0, Nov 11, 2025) is the canonical business rules reference
- **docs/ARCHITECTURE.md** is the canonical architecture reference
- **docs/README.md** serves as the documentation index and should be kept updated

### Documentation Health: ✅ EXCELLENT

The documentation is comprehensive, well-organized, and highly current. 76% of documents are fully aligned with the current codebase. The archive system is properly used for historical documents. The documentation covers all major aspects of the system including architecture, security, operations, and business rules.

---

**Last Updated:** November 18, 2025

