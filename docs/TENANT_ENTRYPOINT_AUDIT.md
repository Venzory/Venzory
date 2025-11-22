# Tenant Entrypoint Audit & Hardening Plan

This document summarizes the audit of API routes and Server Actions for adherence to the Venzory "Golden Path" for tenant isolation and security.

## The Golden Path Pattern

Secure entrypoints must follow this structure:

1.  **Context Construction**: Build a `RequestContext` containing `userId`, `practiceId`, and `role`.
    *   Server Actions: `const ctx = await buildRequestContext();`
    *   API Routes: `const ctx = buildRequestContextFromSession(session);` (via `apiHandler` or manual session check)
2.  **RBAC Enforcement**: Assert permissions early.
    *   `requireRole(ctx, 'STAFF');` or `requireRole(ctx, 'ADMIN');`
3.  **Service Layer Usage**: Delegate business logic to Services.
    *   **Never** call Prisma directly in controllers/actions.
    *   **Never** call Repositories directly in controllers/actions (bypass domain logic).
4.  **Tenant Isolation**: Services must use `ctx.practiceId` for all database queries.

### Example (Server Action)

```typescript
export async function strictAction(formData: FormData) {
  // 1. CSRF Check
  await verifyCsrfFromHeaders();
  
  try {
    // 2. Context
    const ctx = await buildRequestContext();
    
    // 3. RBAC
    requireRole(ctx, 'STAFF'); // or 'ADMIN'

    // 4. Service Call
    await myService.doSomething(ctx, formData.get('id'));
    
    revalidatePath('/...');
    return { success: true };
  } catch (error) {
    // Error handling...
  }
}
```

## Audit Findings

### Compliant Modules (Golden Path Aligned)
- `app/(dashboard)/inventory/actions.ts`: Uses `InventoryService`, `buildRequestContext`, `requireRole`.
- `app/(dashboard)/receiving/actions.ts`: Uses `ReceivingService`.
- `app/(dashboard)/stock-count/actions.ts`: Uses `InventoryService`.
- `app/(dashboard)/settings/actions.ts`: Uses `SettingsService`.
- `app/api/notifications/*`: Uses `NotificationService`.
- `app/(dashboard)/orders/actions.ts`: Uses `OrderService`.
- `app/(dashboard)/my-items/actions.ts`: Uses `OrderService` (for converting catalog items).
- `app/(dashboard)/supplier-catalog/actions.ts`: Uses `ItemService`.
- `app/(dashboard)/settings/products/actions.ts`: Uses `ProductService`.
- `app/api/invites/route.ts`: Uses `SettingsService`.

### Fixed & Refactored Modules

| File | Issue | Status |
|------|-------|--------|
| `app/api/cron/cleanup-audit-logs/route.ts` | Direct `prisma` usage. | **[FIXED]** Moved logic to `AuditService`. |
| `app/api/inventory/[locationId]/[itemId]/route.ts` | Direct `InventoryRepository` usage. | **[FIXED]** Exposed method in `InventoryService`. |
| `app/(dashboard)/suppliers/actions.ts` | Manual `hasRole` checks. | **[FIXED]** Standardized on `requireRole`. |
| `app/(dashboard)/orders/templates/actions.ts` | Manual `hasRole` checks. | **[FIXED]** Standardized on `requireRole`. |

### Public / System Routes (Auth & Cron)
These routes handle authentication or system tasks and have specialized context requirements:
- `app/api/auth/register/route.ts`: Public registration (rate-limited).
- `app/api/auth/reset-password/route.ts`: Public password reset.
- `app/api/auth/forgot-password/route.ts`: Public password reset request.
- `app/api/invites/accept/route.ts`: Public invite acceptance.
- `app/api/cron/email-jobs/route.ts`: System cron (key-protected).

### Acceptable Exceptions
- `app/api/health/route.ts`: Direct database ping is acceptable for health checks (minimal dependency).

## Implementation Plan

1.  **Architecture**: Extend `AuditService` (cleanup) and `InventoryService` (read-only location inventory). **[COMPLETED]**
2.  **Refactor**: Update the identified non-compliant files to use the Service layer. **[COMPLETED]**
3.  **Verify**: Ensure tests cover the changes. **[COMPLETED]**

### Remaining Tasks
- None. All identified vulnerabilities and inconsistencies have been addressed.
