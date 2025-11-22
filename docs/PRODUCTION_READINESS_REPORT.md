# Production Readiness Assessment

Based on a deep code review, this report outlines the critical risks and gaps preventing Venzory from being safely used by real medical practices.

## 🚨 Critical Blockers (Must Fix Before Launch)

1.  **Background Job Infrastructure Missing**
    *   **Risk:** Critical. Order emails are currently sent synchronously within the request handler (`OrderService.sendOrder` awaits `sendOrderEmail` -> `resend.emails.send`).
    *   **Impact:** If Resend is slow or down, the "Send Order" action will time out or fail, potentially leaving the database in an inconsistent state (Order marked 'SENT' but email failed, or transaction rolled back but user confused).
    *   **Recommendation:** Introduce a job queue (e.g., BullMQ with Redis) to handle email delivery asynchronously and reliably with retries.

2.  **Rate Limiting is "Fail Open" & Redis Optional**
    *   **Risk:** High. `src/lib/rate-limit.ts` falls back to in-memory limiting if Redis is missing or fails (`Redis rate limiter error - failing open`). In a containerized/serverless environment (like Vercel), in-memory limiting is ineffective as it doesn't share state between instances.
    *   **Recommendation:** Enforce Redis connection for production. Do not allow "fail open" for critical auth routes like login/password reset.

3.  **No Virus Scanning for Uploads**
    *   **Risk:** Medium/High. While file uploads (e.g. for invoices/receipts) weren't explicitly seen in the analyzed files, any future feature adding attachments to Orders must have virus scanning.
    *   **Status:** Currently no evidence of file upload handling, but this is a standard requirement for medical software.

## ⚠️ Operational Risks

1.  **Database Health Check is Shallow**
    *   **Observation:** `app/api/health/route.ts` only runs `SELECT 1`.
    *   **Gap:** It does not check Redis connectivity (used for rate limiting) or external services (Resend).
    *   **Fix:** Expand health check to include Redis ping and vital external dependencies.

2.  **Audit Logs exist but Retention Policy is Unclear**
    *   **Observation:** `AuditService` is well-implemented and used.
    *   **Gap:** No mechanism seen to archive or prune old audit logs. Over time, the `AuditLog` table will grow indefinitely, impacting performance.
    *   **Fix:** Implement a cron job or partition strategy to manage audit log growth.

## 🛠 Workflow & Integration Gaps

1.  **Supplier Integration is Email-Only**
    *   **Observation:** `sendOrderEmail` sends a simple HTML table.
    *   **Gap:** Large suppliers often require EDI or specific CSV formats. Relying solely on email text is error-prone for the supplier (manual entry) and the practice (no confirmation of receipt).
    *   **Fix:** Future-proof the `OrderService` to support "Integration Adapters" (e.g., different send strategies per supplier).

2.  **Inventory "Freezing" during Stock Counts**
    *   **Observation:** `completeStockCount` detects concurrency conflicts but has a manual "Admin Override" or "Redo Count" policy.
    *   **Gap:** In a busy practice, inventory changes constantly. Forcing a "Redo" can be frustrating.
    *   **Fix:** Consider a "Freeze" mechanism or softer warnings that allow partial updates rather than blocking the whole commit.

## Summary of Recommendations

| Priority | Category | Recommendation |
| :--- | :--- | :--- |
| **P0** | Reliability | **Implement Job Queue:** Move email sending to a background worker (BullMQ). |
| **P0** | Security | **Enforce Redis:** Make Redis mandatory for rate limiting in production; remove "fail open". |
| **P1** | Ops | **Deep Health Checks:** Monitor Redis and integrations in `/health`. |
| **P1** | Feature | **Supplier Adapters:** Design patterns for non-email ordering (CSV/API). |
| **P2** | Ops | **Log Rotation:** automated cleanup for Audit Logs. |

