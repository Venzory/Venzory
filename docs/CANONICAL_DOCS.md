# Canonical Documentation Index

**Purpose:** Authoritative "source of truth" documents for RemcuraV2  
**Last Updated:** November 18, 2025  
**For:** AI tools, developers, and team members

---

## How to Use This Index

This document lists the **canonical** (authoritative) documentation for RemcuraV2. When there are multiple documents on a topic, the ones listed here are the **current and accurate** sources of truth.

**Rules:**
1. ✅ **Always reference these documents** for current system state
2. 🗂️ **Historical context** is in `docs/archive/` - useful for understanding decisions but not current truth
3. 📋 **Complete inventory** is in `docs/DOC_INVENTORY.md` - all 62 docs cataloged with currency assessment

---

## 🎯 Core Reference Documents

### Product & Status

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **MVP Flow Status Report** | `docs/product/MVP_FLOW_STATUS_REPORT.md` | Current status of all 7 core flows, MVP readiness assessment | Nov 18, 2025 |

**Use this for:** Understanding what works today, what needs attention, current feature status, MVP deployment readiness.

---

## 🏗️ Architecture

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **System Architecture** | `docs/architecture/ARCHITECTURE.md` | Go-Ready layered architecture (API → Service → Repository → DB) | Current |
| **Domain Rules & Invariants** | `docs/architecture/DOMAIN_RULES.md` | Business rules across 5 domains, enforcement levels (v2.0) | Nov 11, 2025 |
| **Implementation Summary** | `docs/architecture/IMPLEMENTATION_SUMMARY.md` | Phase 1-5 architecture refactor completion | Current |
| **Migration Guide** | `docs/architecture/MIGRATION_GUIDE.md` | How to migrate from direct Prisma to service/repository layer | Current |
| **Transaction Boundaries** | `docs/architecture/TRANSACTION_BOUNDARIES_SUMMARY.md` | Transaction usage patterns in services | Current |
| **Type Safety Improvements** | `docs/architecture/TYPE_SAFETY_IMPROVEMENTS.md` | Prisma transforms and domain type improvements | Nov 18, 2025 |
| **Style Guide** | `docs/architecture/STYLE_GUIDE.md` | Design tokens, typography, components | Current |
| **Style Guide Implementation** | `docs/architecture/STYLE_GUIDE_IMPLEMENTATION.md` | /style-guide route implementation | Nov 16, 2025 |

**Use these for:** Understanding system design, coding patterns, business rules, domain models, architectural decisions.

### Architecture - Audit Analysis

Comprehensive audit of data model and business invariants (subdirectory: `docs/architecture/audit-analysis/`):

| Document | Purpose |
|----------|---------|
| `README.md` | Index for audit analysis documents |
| `00-AUDIT-SUMMARY.md` | Executive summary - 130 invariants, P1 gaps resolved |
| `01-schema-constraints-analysis.md` | Database constraints, FK relationships, cascade behaviors |
| `02-domain-models-invariants.md` | Domain model analysis across Orders, Receiving, Inventory, Suppliers, Products |
| `03-service-validators-analysis.md` | Service layer enforcement and domain validators |
| `04-comprehensive-invariants-matrix.md` | Complete matrix of all 130 invariants with enforcement levels |

**Use these for:** Understanding data integrity, business rules enforcement, constraint implementation.

---

## 🔒 Security

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Security Implementation Final** | `docs/security/SECURITY_IMPLEMENTATION_FINAL.md` | Security headers, CSP, nonces, production-ready implementation | Nov 12, 2025 |
| **P1 Verification Report** | `docs/security/P1_VERIFICATION_REPORT.md` | Security audit: NextAuth, CSRF, RBAC, CSP, tenant isolation | Nov 13, 2025 |
| **Tenant Isolation Fixes** | `docs/security/TENANT_ISOLATION_FIXES_SUMMARY.md` | practiceId validation in 13 repository methods | Current |

**Use these for:** Security configuration, CSP setup, authentication, authorization, tenant isolation, security best practices.

---

## 🔧 Operations

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Operations Runbook** | `docs/operations/OPS_RUNBOOK.md` | DB verification, migrations, drift detection, rollback procedures | Nov 16, 2025 |
| **Health Check Report** | `docs/operations/HEALTH_CHECK_REPORT.md` | Comprehensive health check after Go-ready architecture | Nov 9, 2025 |
| **Tech Health Report** | `docs/operations/TECH_HEALTH.md` | Pre-integration health check, build/lint status | Nov 11, 2025 |
| **MVP Audit Final** | `docs/operations/mvp-audit-final.md` | MVP functional audit, CSP fix verification | Nov 17, 2025 |
| **Suppliers Health Check** | `docs/operations/SUPPLIERS_HEALTH_CHECK_REPORT.md` | Supplier module verification | Nov 13, 2025 |

**Use these for:** Deployment procedures, troubleshooting, health checks, operational procedures.

### Operations - Test Checklists

| Document | Path | Purpose |
|----------|------|---------|
| **Receiving Smoke Test** | `docs/operations/RECEIVING_SMOKE_TEST.md` | Manual test checklist for receiving flow |
| **Stock Counting Test Checklist** | `docs/operations/STOCK_COUNTING_MANUAL_TEST_CHECKLIST.md` | Manual test checklist for stock counting |

**Use these for:** Manual testing procedures, QA checklists.

---

## 🗄️ Infrastructure

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Migration Status** | `docs/infra/MIGRATION_STATUS.md` | All applied migrations, drift status | Nov 16, 2025 |
| **Unique Constraints** | `docs/infra/UNIQUE_CONSTRAINTS_IMPLEMENTATION_SUMMARY.md` | Item/Location unique constraints | Nov 13, 2025 |

**Use these for:** Database migrations, schema changes, deployment.

### Infrastructure - Migrations

Detailed migration guides (subdirectory: `docs/infra/migrations/`):

| Document | Purpose |
|----------|---------|
| `database-constraint-hardening.md` | onDelete policies, CHECK constraints, unique constraints (Nov 11, 2025) |
| `20251116000000_formalize_remaining_drift.md` | LocationInventory.createdAt and performance indexes (Nov 16, 2025) |

**Use these for:** Understanding specific migrations, deployment procedures, rollback steps.

---

## 📦 Inventory & Receiving

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Receiving Module Implementation** | `docs/inventory/RECEIVING_MODULE_IMPLEMENTATION.md` | GoodsReceipt, RBAC, navigation | Nov 8, 2025 |
| **Partial Receiving Feature** | `docs/inventory/PARTIAL_RECEIVING_FEATURE.md` | Multiple shipment receiving flow | Current |
| **Receiving Hardening** | `docs/inventory/RECEIVING_HARDENING_SUMMARY.md` | Null-safety and validation improvements | Nov 17, 2025 |
| **Stock Counting Production Ready** | `docs/inventory/STOCK_COUNTING_PRODUCTION_READY.md` | Concurrency handling, validation, testing | Nov 2024 |
| **Locations Hardening** | `docs/inventory/LOCATIONS_HARDENING_SUMMARY.md` | Location deletion safeguards, hierarchy validation | Current |
| **My Items Hardening** | `docs/inventory/MY_ITEMS_HARDENING_SUMMARY.md` | Supplier filter, low-stock filtering fixes | Current |

**Use these for:** Receiving workflows, stock counting, location management, inventory features.

---

## 📋 Orders

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Multi-Supplier Templates** | `docs/orders/MULTI_SUPPLIER_TEMPLATES_IMPLEMENTATION.md` | Multi-supplier order template feature | Nov 17, 2025 |
| **Quick Reorder** | `docs/orders/QUICK_REORDER_IMPLEMENTATION_SUMMARY.md` | Template-based quick ordering | Current |

**Use these for:** Order management, templates, quick reorder feature.

---

## 🏢 Suppliers

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Global Supplier Migration** | `docs/suppliers/GLOBAL_SUPPLIER_MIGRATION.md` | Phase 1: GlobalSupplier and PracticeSupplier tables | Nov 11, 2025 |
| **Phase 2 Supplier Integration** | `docs/suppliers/PHASE_2_SUPPLIER_INTEGRATION.md` | practiceSupplierId in Order, SupplierItem, Item | Nov 11, 2025 |

**Use these for:** Supplier architecture, global/practice supplier model, dual-supplier pattern.

---

## 🧪 Process & Development

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Testing Guide** | `docs/process/TESTING.md` | Vitest setup, unit vs integration tests | Current |
| **i18n Reset Summary** | `docs/process/i18n-reset-summary.md` | Removal of broken i18n, single-language app | Nov 5, 2025 |

**Use these for:** Testing procedures, development practices, historical context on i18n decisions.

---

## 📚 Documentation Meta

| Document | Path | Purpose | Last Updated |
|----------|------|---------|--------------|
| **Documentation Index** | `docs/README.md` | Index of all documentation with links | Nov 11, 2025 |
| **Documentation Inventory** | `docs/DOC_INVENTORY.md` | Complete inventory of all 62 docs with currency assessment | Nov 18, 2025 |
| **Implementation History** | `docs/REMCURA_IMPLEMENTATION_HISTORY.md` | Chronological record of major milestones (Nov 11-17, 2025) | Nov 18, 2025 |

**Use these for:** Finding documentation, understanding what's current vs historical, navigating the docs.

---

## 📖 Project README

| Document | Path | Purpose |
|----------|------|---------|
| **Project README** | `README.md` (root) | Stack, setup, auth, RBAC, security, production features |

**Use this for:** Getting started, understanding the tech stack, setup instructions, production features.

---

## 🗂️ Historical Context

**Location:** `docs/archive/`

The archive contains 15 historical documents including:
- Phase completion reports (superseded by current docs)
- Implementation status snapshots (superseded by current docs)
- Verification reports (superseded by health checks)
- Feature implementation summaries (superseded by feature docs)

**When to use archived docs:**
- Understanding past decisions
- Historical context for architectural changes
- Tracking evolution of features
- Reference for "why we did it this way"

**Important:** Archived docs are **not current truth** - they provide historical context only.

---

## 🎯 Quick Reference by Use Case

### "I need to understand the current system"
1. Start: `docs/product/MVP_FLOW_STATUS_REPORT.md`
2. Architecture: `docs/architecture/ARCHITECTURE.md`
3. Domain rules: `docs/architecture/DOMAIN_RULES.md`

### "I need to deploy or operate the system"
1. Start: `docs/operations/OPS_RUNBOOK.md`
2. Migrations: `docs/infra/MIGRATION_STATUS.md`
3. Health checks: `docs/operations/HEALTH_CHECK_REPORT.md`

### "I need to understand security"
1. Start: `docs/security/SECURITY_IMPLEMENTATION_FINAL.md`
2. Verification: `docs/security/P1_VERIFICATION_REPORT.md`
3. Project README security section: `README.md`

### "I need to work on a specific feature"
- **Orders**: `docs/orders/` directory
- **Inventory/Receiving**: `docs/inventory/` directory
- **Suppliers**: `docs/suppliers/` directory
- **Architecture**: `docs/architecture/` directory

### "I need to understand what changed recently"
1. Implementation history: `docs/REMCURA_IMPLEMENTATION_HISTORY.md`
2. MVP status: `docs/product/MVP_FLOW_STATUS_REPORT.md`
3. Health checks: `docs/operations/HEALTH_CHECK_REPORT.md`

---

## 📊 Documentation Statistics

- **Total documents**: 62
- **Current (yes)**: 47 documents (76%)
- **Partially current (maybe)**: 6 documents (10%)
- **Outdated/archived (no)**: 9 documents (14%)
- **Canonical documents**: 47 (listed in this index)
- **Archived documents**: 15 (in `docs/archive/`)

---

## 🔄 Maintenance

**This document should be updated when:**
- New authoritative documentation is created
- Existing canonical docs are superseded
- Major features are completed
- Architecture changes significantly

**Maintained by:** Development Team  
**Review frequency:** After each major milestone or monthly

---

**Last Updated:** November 18, 2025  
**Version:** 1.0

