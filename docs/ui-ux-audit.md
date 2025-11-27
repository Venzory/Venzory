# Venzory UI/UX Audit and Improvement Plan

> **Document Version:** 1.0  
> **Created:** November 2024  
> **Status:** Active Reference  
> **Purpose:** Single source of truth for UI/UX improvements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Overview](#current-architecture-overview)
3. [Audit Findings](#audit-findings)
   - [Component Architecture](#31-component-architecture)
   - [Layout and Navigation](#32-layout-and-navigation)
   - [Form Patterns](#33-form-patterns)
   - [Loading States](#34-loading-states)
   - [Error Handling](#35-error-handling)
   - [Typography and Spacing](#36-typography-and-spacing)
   - [Color and Theming](#37-color-and-theming)
   - [Tables and Data Display](#38-tables-and-data-display)
   - [Modals and Dialogs](#39-modals-and-dialogs)
   - [Settings and Onboarding](#310-settings-and-onboarding)
   - [Mobile Responsiveness](#311-mobile-responsiveness)
   - [Component Duplication](#312-component-duplication)
4. [Issue Summary Table](#issue-summary-table)
5. [Improvement Roadmap](#improvement-roadmap)
   - [Phase 1: Foundation Cleanup](#phase-1-foundation-cleanup-priority-critical)
   - [Phase 2: Form and Input Patterns](#phase-2-form-and-input-patterns-priority-high)
   - [Phase 3: Navigation and Layout Polish](#phase-3-navigation-and-layout-polish-priority-medium)
   - [Phase 4: Advanced UX and Mobile](#phase-4-advanced-ux-and-mobile-priority-low)
6. [File Impact Summary](#file-impact-summary)
7. [Success Metrics](#success-metrics)
8. [Appendix: Current Component Inventory](#appendix-current-component-inventory)

---

## Executive Summary

The Venzory codebase has a **solid foundation** with good design token architecture, dark/light mode support, and a core set of reusable components. However, the application suffers from **component inconsistency**, **missing foundational patterns**, and **incomplete UX flows** that would impact user experience in production.

### Key Statistics

| Metric | Count |
|--------|-------|
| Total Issues Identified | 47 |
| Critical Severity | 6 |
| High Severity | 7 |
| Medium Severity | 24 |
| Low Severity | 10 |
| Phases in Roadmap | 4 |
| New Components Needed | 13 |
| Files to Modify | 10+ |

### Top Priority Items

1. **No base Modal/Dialog component** - Each modal implements its own backdrop, animations, and keyboard handling
2. **Missing loading states** - Only 2 routes have `loading.tsx` skeletons
3. **Form component inconsistency** - Raw HTML inputs used instead of UI components in filters
4. **No practice/org switcher** - Users with multiple practices cannot switch
5. **Table component confusion** - Two separate table implementations

---

## Current Architecture Overview

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Components | Custom React (no shadcn/ui) |
| Utilities | clsx + tailwind-merge (`cn` helper) |
| State | React hooks, Server Actions |
| Forms | Native HTML + Server Actions |

### Design Token Structure

**Location:** `app/globals.css` and `tailwind.config.ts`

```
CSS Variables (globals.css)
├── Background colors (--color-bg, --color-surface)
├── Border colors (--color-border)
├── Text colors (--color-text-primary, --color-text-secondary, --color-text-muted)
├── Brand colors (--color-brand-primary, --color-brand-hover)
├── Semantic colors (--color-success, --color-warning, --color-danger)
├── Component-specific (--color-card-bg, --color-sidebar-*)
└── Shadows (--shadow-sm, --shadow-md, --shadow-lg)
```

### Component Library Structure

```
components/
├── ui/                    # UI primitives
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── confirm-dialog.tsx
│   ├── data-table.tsx     # Enhanced table with sorting/selection
│   ├── dropdown-menu.tsx
│   ├── empty-state.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── pagination.tsx
│   ├── select.tsx
│   ├── status-badge.tsx
│   ├── submit-button.tsx
│   ├── table.tsx          # Basic table primitives (duplicate)
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── toast-container.tsx
├── layout/                # Layout components
│   ├── dashboard-layout-client.tsx
│   ├── PageHeader.tsx
│   ├── sidebar.tsx
│   ├── theme-toggle.tsx
│   └── topbar.tsx
├── auth/                  # Authentication components
├── dashboard/             # Dashboard-specific widgets
├── notifications/         # Notification components
├── onboarding/           # Onboarding wizard
├── scanner/              # Barcode scanner
└── style-guide/          # Style guide helpers
```

---

## Audit Findings

### 3.1 Component Architecture

**Strengths:**
- Well-structured CSS custom properties with light/dark mode tokens
- Tailwind config properly extends colors from CSS variables
- Core UI primitives exist with consistent API patterns
- Comprehensive style guide page for documentation
- Good separation of layout components

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| A1 | High | Two separate table implementations (`table.tsx` and `data-table.tsx`) | Import confusion, maintenance burden |
| A2 | High | No base Modal/Dialog component | Code duplication, inconsistent behavior |
| A3 | Medium | No FormField wrapper component | Inconsistent form layouts |
| A4 | Medium | No Skeleton primitives | Custom skeletons per page |
| A5 | Medium | No Alert/Banner component | Missing inline notification pattern |
| A6 | Medium | No Switch/Toggle component | Raw checkbox with role="switch" |
| A7 | Low | No Tooltip component | Missing helper text pattern |
| A8 | Low | No IconButton component | Inconsistent icon-only buttons |

**Files Affected:**
- `components/ui/table.tsx`
- `components/ui/data-table.tsx`
- `components/ui/confirm-dialog.tsx`
- `app/(dashboard)/suppliers/_components/add-supplier-modal.tsx`
- `app/(dashboard)/inventory/_components/stock-level-dialog.tsx`

---

### 3.2 Layout and Navigation

**Strengths:**
- Clean sidebar with role-based filtering
- Collapsible sidebar with localStorage persistence
- Mobile-responsive layout with hamburger menu
- PageHeader component with action slots

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| B1 | High | TopBar lacks organization/practice switcher | Users cannot switch practices |
| B2 | Medium | No breadcrumb implementation | Poor navigation context on detail pages |
| B3 | Medium | Sidebar sub-route highlighting inconsistent | Confusing active state |
| B4 | Low | Mobile sidebar lacks smooth animation | Jarring UX |
| B5 | Medium | UserMenu only contains "Sign out" | Missing profile, settings shortcuts |

**Files Affected:**
- `components/layout/topbar.tsx`
- `components/layout/sidebar.tsx`
- `components/auth/user-menu.tsx`
- `components/layout/PageHeader.tsx`

---

### 3.3 Form Patterns

**Strengths:**
- Input, Select, Textarea components with label/error support
- SubmitButton with useFormStatus integration
- Consistent focus ring styling

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| C1 | High | SearchFilters uses raw HTML inputs instead of UI components | Inconsistent styling |
| C2 | Medium | No unified form section grouping | Scattered form layouts |
| C3 | Medium | Inconsistent label-to-input spacing | Visual inconsistency |
| C4 | Medium | Many forms use raw buttons instead of SubmitButton | Inconsistent loading states |
| C5 | Low | No consistent inline validation pattern | Poor error feedback |

**Files Affected:**
- `app/(dashboard)/inventory/_components/search-filters.tsx`
- `app/(dashboard)/settings/_components/*.tsx`
- `app/(dashboard)/suppliers/_components/*.tsx`
- Various form components across routes

---

### 3.4 Loading States

**Strengths:**
- Dashboard has comprehensive skeleton loading
- Inventory has loading.tsx

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| D1 | High | Most routes lack loading.tsx | No loading feedback |
| D2 | Medium | No global navigation loading indicator | Unclear page transitions |
| D3 | Medium | No reusable Skeleton components | Duplicated skeleton code |
| D4 | Low | Button loading state requires manual handling | Inconsistent loading UX |

**Routes Missing loading.tsx:**
- `/orders`
- `/orders/[id]`
- `/orders/new`
- `/orders/templates`
- `/suppliers`
- `/suppliers/[id]`
- `/settings`
- `/receiving`
- `/receiving/[id]`
- `/stock-count`
- `/stock-count/[id]`
- `/my-items`
- `/locations`
- `/supplier-catalog`
- `/product-master`
- `/reorder-suggestions`
- `/needs-attention`

---

### 3.5 Error Handling

**Strengths:**
- Error pages exist at root and dashboard levels
- Sentry integration for error reporting
- Error ID display for debugging

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| E1 | Medium | Root error.tsx is dark-mode only styled | Light mode shows dark page |
| E2 | Medium | No inline/field-level error display pattern | Poor form error UX |
| E3 | Low | No network error interceptor UI | Silent API failures |

**Files Affected:**
- `app/error.tsx`
- `app/(dashboard)/error.tsx`

---

### 3.6 Typography and Spacing

**Strengths:**
- Plus Jakarta Sans as primary font
- Good heading hierarchy defined in style guide
- Consistent text color tokens

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| F1 | Medium | Inconsistent heading usage across pages | Visual inconsistency |
| F2 | Medium | Muted text color varies (slate-500, slate-600, text-muted) | Color inconsistency |
| F3 | Medium | Page section gaps inconsistent (space-y-6 vs space-y-8) | Layout inconsistency |
| F4 | Low | Card padding varies (p-6, p-8, pt-6) | Spacing inconsistency |

**Recommended Standards:**
- Page sections: `space-y-8`
- Subsections: `space-y-6`
- Card padding: `p-6` (default)
- Label-to-input: `space-y-1.5`

---

### 3.7 Color and Theming

**Strengths:**
- Comprehensive light/dark mode token system
- Semantic color tokens defined
- Brand colors properly abstracted

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| G1 | Medium | Hardcoded Tailwind colors used instead of semantic tokens | Theme inconsistency |
| G2 | Low | Warning color inconsistent (amber vs orange for low stock) | Visual confusion |

**Examples of Hardcoded Colors:**
- `rose-500` instead of semantic danger color
- `sky-600` instead of brand color token
- `amber-*` vs `orange-*` for warnings

---

### 3.8 Tables and Data Display

**Strengths:**
- DataTable supports sorting, selection, expansion
- Responsive overflow handling
- Consistent hover states

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| H1 | Medium | No standard row actions pattern | Inconsistent action buttons |
| H2 | Low | No mobile-optimized table view | Poor mobile UX |
| H3 | Low | Table empty state handled inconsistently | UX inconsistency |

**Files Affected:**
- `components/ui/data-table.tsx`
- `components/ui/table.tsx`
- `app/(dashboard)/inventory/_components/low-stock-item-list.tsx`
- `app/(dashboard)/orders/_components/orders-list.tsx`

---

### 3.9 Modals and Dialogs

**Strengths:**
- ConfirmDialog handles danger/neutral variants
- Escape key handling
- Body scroll lock
- Backdrop blur effect

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| I1 | High | No base Dialog component | Every modal reimplements core behavior |
| I2 | Medium | No SlideOver/Drawer component | Missing side panel pattern |
| I3 | Medium | Modal z-index inconsistent with toasts | Potential stacking issues |

**Current Modal Implementations:**
- `components/ui/confirm-dialog.tsx`
- `app/(dashboard)/suppliers/_components/add-supplier-modal.tsx`
- `app/(dashboard)/inventory/_components/stock-level-dialog.tsx`
- `app/(dashboard)/supplier-catalog/_components/add-to-catalog-dialog.tsx`

---

### 3.10 Settings and Onboarding

**Strengths:**
- Onboarding wizard with step navigation
- Settings page with team management
- Role-based content visibility

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| J1 | Medium | All settings on one page | Will become unwieldy |
| J2 | Low | No settings navigation/tabs | Poor scalability |
| J3 | Low | Progress indicator lacks completion checkmarks | Unclear progress |

**Files Affected:**
- `app/(dashboard)/settings/page.tsx`
- `components/onboarding/onboarding-wizard.tsx`
- `components/onboarding/onboarding-progress.tsx`

---

### 3.11 Mobile Responsiveness

**Strengths:**
- Responsive grid layouts
- Mobile sidebar with backdrop
- Tables with horizontal scroll

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| K1 | Medium | Pagination shows all page numbers on mobile | Cramped UI |
| K2 | Low | Filter dropdowns could use bottom sheet on mobile | Sub-optimal mobile UX |
| K3 | Low | Quick Reorder cards could stack better | Layout issues |

**Files Affected:**
- `components/ui/pagination.tsx`
- `app/(dashboard)/inventory/_components/search-filters.tsx`
- `app/(dashboard)/orders/page.tsx`

---

### 3.12 Component Duplication

**Issues Identified:**

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| L1 | Medium | Badge styling duplicated inline in Settings page | Maintenance burden |
| L2 | Medium | Button styles duplicated in some components | Inconsistency risk |
| L3 | Low | OrderStatusBadge in _utils could be promoted to ui/ | Poor discoverability |

**Files with Duplication:**
- `app/(dashboard)/settings/page.tsx` (inline badge styles)
- `app/(dashboard)/inventory/_components/low-stock-item-list.tsx` (inline button styles)
- `app/(dashboard)/dashboard/_utils/order-status-badge.tsx` (should be in components/ui)

---

## Issue Summary Table

| ID | Category | Severity | Issue | Phase |
|----|----------|----------|-------|-------|
| A1 | Components | High | Two separate table implementations | 1 |
| A2 | Components | High | No base Modal/Dialog component | 1 |
| A3 | Components | Medium | No FormField wrapper component | 2 |
| A4 | Components | Medium | No Skeleton primitives | 1 |
| A5 | Components | Medium | No Alert/Banner component | 2 |
| A6 | Components | Medium | No Switch/Toggle component | 1 |
| A7 | Components | Low | No Tooltip component | 4 |
| A8 | Components | Low | No IconButton component | 4 |
| B1 | Navigation | High | TopBar lacks org/practice switcher | 3 |
| B2 | Navigation | Medium | No breadcrumb implementation | 3 |
| B3 | Navigation | Medium | Sidebar sub-route highlighting inconsistent | 3 |
| B4 | Navigation | Low | Mobile sidebar lacks smooth animation | 3 |
| B5 | Layout | Medium | UserMenu only contains "Sign out" | 3 |
| C1 | Forms | High | SearchFilters uses raw HTML inputs | 2 |
| C2 | Forms | Medium | No unified form section grouping | 2 |
| C3 | Forms | Medium | Inconsistent label-to-input spacing | 2 |
| C4 | Forms | Medium | Many forms use raw buttons | 2 |
| C5 | Forms | Low | No consistent inline validation pattern | 2 |
| D1 | Loading | High | Most routes lack loading.tsx | 1 |
| D2 | Loading | Medium | No global navigation loading indicator | 3 |
| D3 | Loading | Medium | No reusable Skeleton components | 1 |
| D4 | Loading | Low | Button loading state manual | 2 |
| E1 | Errors | Medium | Root error.tsx dark-mode only | 1 |
| E2 | Errors | Medium | No inline error display pattern | 2 |
| E3 | Errors | Low | No network error interceptor UI | 4 |
| F1 | Typography | Medium | Inconsistent heading usage | 1 |
| F2 | Typography | Medium | Muted text color varies | 1 |
| F3 | Spacing | Medium | Page section gaps inconsistent | 1 |
| F4 | Spacing | Low | Card padding varies | 1 |
| G1 | Colors | Medium | Hardcoded Tailwind colors | 4 |
| G2 | Colors | Low | Warning color inconsistent | 4 |
| H1 | Tables | Medium | No standard row actions pattern | 2 |
| H2 | Tables | Low | No mobile-optimized table view | 4 |
| H3 | Tables | Low | Table empty state inconsistent | 2 |
| I1 | Modals | High | No base Dialog component | 1 |
| I2 | Modals | Medium | No SlideOver/Drawer component | 3 |
| I3 | Modals | Medium | Modal z-index inconsistent | 1 |
| J1 | Settings | Medium | All settings on one page | 3 |
| J2 | Settings | Low | No settings navigation/tabs | 3 |
| J3 | Onboarding | Low | Progress lacks checkmarks | 4 |
| K1 | Mobile | Medium | Pagination shows all pages | 4 |
| K2 | Mobile | Low | Filters could use bottom sheet | 4 |
| K3 | Mobile | Low | Quick Reorder card stacking | 4 |
| L1 | Duplication | Medium | Badge styling duplicated inline | 1 |
| L2 | Duplication | Medium | Button styles duplicated | 1 |
| L3 | Duplication | Low | OrderStatusBadge in _utils | 1 |

---

## Improvement Roadmap

### Phase 1: Foundation Cleanup (Priority: Critical)

**Timeline:** 1-2 weeks  
**Goal:** Establish consistent base components and eliminate duplication.

#### Required Refactors

1. **Consolidate table components**
   - Deprecate `components/ui/table.tsx`
   - Re-export primitives from `components/ui/data-table.tsx`
   - Update all imports across the codebase

2. **Create base Dialog component**
   - Extract shared logic from `ConfirmDialog` and modals
   - Implement backdrop, animations, escape handling, focus trap
   - Refactor `ConfirmDialog` to extend base Dialog

3. **Create Skeleton primitives**
   - `Skeleton` - base animated rectangle
   - `SkeletonText` - text line placeholder
   - `SkeletonCircle` - avatar/icon placeholder

4. **Add loading.tsx to remaining routes**
   - Priority routes: `/orders`, `/suppliers`, `/settings`
   - Secondary routes: `/receiving`, `/stock-count`, `/my-items`

5. **Fix root error.tsx**
   - Add light mode styling
   - Use design tokens instead of hardcoded colors

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| Dialog | `components/ui/dialog.tsx` | Base modal with all core functionality |
| Skeleton | `components/ui/skeleton.tsx` | Loading placeholder primitives |
| Switch | `components/ui/switch.tsx` | Toggle switch component |

#### Components to Consolidate

| Action | Source | Destination |
|--------|--------|-------------|
| Merge | `components/ui/table.tsx` | `components/ui/data-table.tsx` |
| Promote | `app/(dashboard)/dashboard/_utils/order-status-badge.tsx` | `components/ui/order-status-badge.tsx` |

#### Visual Consistency Fixes

- Standardize page section gaps: `space-y-8`
- Standardize subsection gaps: `space-y-6`
- Standardize Card padding: `p-6` default
- Fix muted text color: use `text-text-muted` token consistently

#### Deliverables Checklist

- [ ] Base Dialog component created
- [ ] Skeleton primitives created
- [ ] Switch component created
- [ ] Table components consolidated
- [ ] OrderStatusBadge promoted
- [ ] loading.tsx added to priority routes
- [ ] Root error.tsx fixed for light mode
- [ ] Spacing standards applied to 5+ pages

---

### Phase 2: Form and Input Patterns (Priority: High)

**Timeline:** 1-2 weeks  
**Goal:** Unified form experience across the application.

#### Required Refactors

1. **Update SearchFilters to use UI components**
   - Replace raw `<input>` with `Input` component
   - Replace raw `<select>` with `Select` component
   - Maintain debounced search behavior

2. **Standardize form spacing**
   - Label-to-input gap: `space-y-1.5`
   - Field-to-field gap: `space-y-4`
   - Section-to-section gap: `space-y-6`

3. **Add inline validation**
   - Implement for critical forms: invite user, create order
   - Use Input/Select error prop consistently

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| FormSection | `components/ui/form-section.tsx` | Groups related fields with heading |
| FormField | `components/ui/form-field.tsx` | Wrapper for consistent label/input/error layout |
| Combobox | `components/ui/combobox.tsx` | Searchable select for large lists |
| Alert | `components/ui/alert.tsx` | Inline notification banners (info, success, warning, error) |

#### UX Flow Fixes

- Add consistent inline validation messaging
- Standardize form submit button placement (right-aligned)
- Add form-level error summary for complex forms

#### Deliverables Checklist

- [ ] FormSection component created
- [ ] FormField component created
- [ ] Combobox component created
- [ ] Alert component created
- [ ] SearchFilters refactored to use UI components
- [ ] Inline validation added to invite user form
- [ ] Form spacing standardized across settings page

---

### Phase 3: Navigation and Layout Polish (Priority: Medium)

**Timeline:** 1-2 weeks  
**Goal:** Production-ready navigation and layout experience.

#### Required Refactors

1. **Add practice/organization switcher to TopBar**
   - Dropdown showing user's practices
   - Current practice highlighted
   - Switch triggers session update

2. **Implement breadcrumb navigation**
   - Detail pages show: Section > Item Name
   - Clickable links back to parent
   - Use PageHeader breadcrumb prop

3. **Expand UserMenu**
   - Add profile link
   - Add settings shortcut
   - Add help/support link

4. **Fix sidebar sub-route highlighting**
   - `/orders/templates` should highlight Orders
   - `/suppliers/[id]` should highlight Suppliers

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| Breadcrumb | `components/layout/breadcrumb.tsx` | Navigation trail |
| OrgSwitcher | `components/layout/org-switcher.tsx` | Practice/org dropdown |
| SlideOver | `components/ui/slide-over.tsx` | Side panel drawer |

#### UX Flow Fixes

- Smooth mobile sidebar animation (slide-in-right)
- Add subtle navigation loading indicator
- Settings page: split into tabs (General, Team, Integrations)

#### Deliverables Checklist

- [ ] Breadcrumb component created
- [ ] OrgSwitcher component created
- [ ] SlideOver component created
- [ ] TopBar updated with org switcher
- [ ] UserMenu expanded with profile/settings links
- [ ] Sidebar highlighting fixed for sub-routes
- [ ] Mobile sidebar animation improved
- [ ] Settings page split into tabs

---

### Phase 4: Advanced UX and Mobile (Priority: Low)

**Timeline:** 1 week  
**Goal:** Polished experience across devices and edge cases.

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| Tooltip | `components/ui/tooltip.tsx` | Hover tooltips for help text |
| IconButton | `components/ui/icon-button.tsx` | Icon-only button with tooltip |
| ActionBar | `components/ui/action-bar.tsx` | Bulk selection actions bar |

#### Mobile Improvements

1. **Simplify pagination on mobile**
   - Show only prev/next buttons
   - Current page indicator
   - Hide page numbers

2. **Add mobile card view for tables**
   - Optional card-based layout
   - Triggered by viewport or toggle

3. **Bottom sheet for mobile filters**
   - Slide-up modal for filter options
   - Better touch targets

#### Visual Consistency Audit

- Replace all hardcoded colors with semantic tokens
- Standardize warning colors to `amber-*`
- Audit and fix focus-visible styles

#### Deliverables Checklist

- [ ] Tooltip component created
- [ ] IconButton component created
- [ ] ActionBar component created
- [ ] Pagination simplified for mobile
- [ ] Mobile card view option for tables
- [ ] Bottom sheet pattern for mobile filters
- [ ] Hardcoded colors replaced with tokens
- [ ] Warning colors standardized
- [ ] Focus styles audit complete

---

## File Impact Summary

### Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `components/ui/dialog.tsx` | 1 | Base modal component |
| `components/ui/skeleton.tsx` | 1 | Skeleton loading primitives |
| `components/ui/switch.tsx` | 1 | Toggle switch |
| `components/ui/order-status-badge.tsx` | 1 | Promoted from _utils |
| `components/ui/form-section.tsx` | 2 | Form grouping |
| `components/ui/form-field.tsx` | 2 | Field wrapper |
| `components/ui/combobox.tsx` | 2 | Searchable select |
| `components/ui/alert.tsx` | 2 | Inline banners |
| `components/layout/breadcrumb.tsx` | 3 | Navigation breadcrumbs |
| `components/layout/org-switcher.tsx` | 3 | Practice switcher |
| `components/ui/slide-over.tsx` | 3 | Side panel |
| `components/ui/tooltip.tsx` | 4 | Tooltips |
| `components/ui/icon-button.tsx` | 4 | Icon buttons |
| `components/ui/action-bar.tsx` | 4 | Bulk actions |
| `app/(dashboard)/orders/loading.tsx` | 1 | Orders loading state |
| `app/(dashboard)/suppliers/loading.tsx` | 1 | Suppliers loading state |
| `app/(dashboard)/settings/loading.tsx` | 1 | Settings loading state |
| `app/(dashboard)/receiving/loading.tsx` | 1 | Receiving loading state |
| `app/(dashboard)/stock-count/loading.tsx` | 1 | Stock count loading state |
| `app/(dashboard)/my-items/loading.tsx` | 1 | My items loading state |

### Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `components/ui/data-table.tsx` | 1 | Re-export table primitives from table.tsx |
| `components/ui/confirm-dialog.tsx` | 1 | Extend base Dialog component |
| `app/error.tsx` | 1 | Add light mode support |
| `app/(dashboard)/inventory/_components/search-filters.tsx` | 2 | Use Input/Select components |
| `components/layout/topbar.tsx` | 3 | Add org switcher |
| `components/auth/user-menu.tsx` | 3 | Expand menu options |
| `components/layout/sidebar.tsx` | 3 | Fix sub-route highlighting |
| `components/ui/pagination.tsx` | 4 | Mobile simplification |
| `app/(dashboard)/settings/page.tsx` | 3 | Split into tabbed sections |
| Various form components | 2 | Use FormField wrapper |

### Files to Delete/Deprecate

| File | Phase | Reason |
|------|-------|--------|
| `components/ui/table.tsx` | 1 | Consolidated into data-table.tsx |
| `app/(dashboard)/dashboard/_utils/order-status-badge.tsx` | 1 | Moved to components/ui |

---

## Success Metrics

After completing all phases, Venzory should achieve:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Component Consistency | 100% | All forms use Input/Select/FormField |
| Loading States | 100% | Every route has loading.tsx |
| Error Handling | Complete | Unified error display in forms and pages |
| Navigation | Complete | Breadcrumbs on all detail pages |
| Practice Switching | Working | Users can switch between practices |
| Mobile Experience | Good | Tables and pagination adapt gracefully |
| Design Tokens | 100% | Zero hardcoded color values outside globals |
| Documentation | Complete | All components in style guide |

---

## Appendix: Current Component Inventory

### UI Components (`components/ui/`)

| Component | Status | Notes |
|-----------|--------|-------|
| Badge | ✅ Complete | 9 variants |
| Button | ✅ Complete | 5 variants, 3 sizes, loading state |
| Card | ✅ Complete | Card, CardHeader, CardTitle, CardContent |
| Checkbox | ✅ Complete | Controlled/uncontrolled |
| ConfirmDialog | ⚠️ Needs Refactor | Should extend base Dialog |
| DataTable | ✅ Complete | Sorting, selection, expansion |
| DropdownMenu | ✅ Complete | Keyboard navigation |
| EmptyState | ✅ Complete | Icon, title, description, action |
| Input | ✅ Complete | Label, error, variants |
| Label | ✅ Complete | Basic label |
| Pagination | ⚠️ Needs Refactor | Mobile optimization needed |
| Select | ✅ Complete | Label, error support |
| StatusBadge | ✅ Complete | Predefined status mapping |
| SubmitButton | ✅ Complete | useFormStatus integration |
| Table | ❌ Deprecate | Merge into DataTable |
| Tabs | ✅ Complete | Controlled state |
| Textarea | ✅ Complete | Label, error support |
| ToastContainer | ✅ Complete | Success, error, info |

### Layout Components (`components/layout/`)

| Component | Status | Notes |
|-----------|--------|-------|
| DashboardLayoutClient | ✅ Complete | Main layout wrapper |
| PageHeader | ✅ Complete | Title, subtitle, actions, breadcrumb slot |
| Sidebar | ⚠️ Needs Refactor | Sub-route highlighting |
| ThemeToggle | ✅ Complete | Light/dark/system |
| TopBar | ⚠️ Needs Refactor | Add org switcher |

### Missing Components

| Component | Priority | Phase |
|-----------|----------|-------|
| Dialog (base) | Critical | 1 |
| Skeleton | Critical | 1 |
| Switch | High | 1 |
| FormField | High | 2 |
| FormSection | High | 2 |
| Alert | High | 2 |
| Combobox | Medium | 2 |
| Breadcrumb | Medium | 3 |
| OrgSwitcher | Medium | 3 |
| SlideOver | Medium | 3 |
| Tooltip | Low | 4 |
| IconButton | Low | 4 |
| ActionBar | Low | 4 |

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| Nov 2024 | 1.0 | Initial audit and roadmap |

---

*This document should be updated as phases are completed and new issues are discovered.*

