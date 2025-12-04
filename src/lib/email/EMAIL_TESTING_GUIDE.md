# Email Testing Guide

This document explains how to manually trigger and test each email type in Venzory.

## Prerequisites

1. **Set up sandbox mode** (recommended for safety):
   ```bash
   # In .env.local
   DEV_EMAIL_RECIPIENT=your-email@example.com
   ```
   When set, ALL emails in development/staging are redirected to this address with a `[DEV]` subject prefix.

2. **Set up Resend** (required to actually send):
   ```bash
   # In .env.local
   RESEND_API_KEY=re_your_api_key_here
   ```
   Without this, emails are logged to console but not sent.

---

## Quick Smoke Test

Use the debug route to send test emails:

```bash
# Preview email HTML (doesn't send)
curl http://localhost:3000/api/debug/email-smoke-test?type=password_reset&preview=true

# Send test email
curl http://localhost:3000/api/debug/email-smoke-test?type=password_reset
curl http://localhost:3000/api/debug/email-smoke-test?type=user_invite
curl http://localhost:3000/api/debug/email-smoke-test?type=order
```

---

## Email Types Reference

### 1. Magic Link / Login Code Email

**How to trigger:**
1. Go to `/login`
2. Enter an email address
3. Click "Send magic link"

**Alternatively via API:**
```bash
POST /api/auth/signin/resend
Content-Type: application/json

{ "email": "test@example.com" }
```

**What to expect:**
| Field | Value |
|-------|-------|
| Recipient | User's email (or DEV_EMAIL_RECIPIENT) |
| Subject | `Sign in to app.venzory.com` |
| Preheader | `Click to sign in to your Venzory account or use code [code].` |
| Main CTA | "Sign in" button with magic link URL |
| Key Data | 6-digit login code, 10-minute expiry |

**Console log (dev):**
```
📨 EMAIL LOG (Dev Mode): {
  module: 'auth',
  operation: 'sendVerificationRequest',
  email: 'test@example.com',
  loginCode: '123456',
  ...
}
```

---

### 2. Password Reset Email

**How to trigger:**
1. Go to `/forgot-password`
2. Enter email address
3. Click "Send reset link"

**Alternatively via API:**
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "test@example.com" }
```

**What to expect:**
| Field | Value |
|-------|-------|
| Recipient | User's email (or DEV_EMAIL_RECIPIENT) |
| Subject | `Reset your Venzory password` |
| Preheader | `Click the link to reset your Venzory password. This link expires in 60 minutes.` |
| Main CTA | "Reset Password" button |
| Key Data | Reset token URL, 60-minute expiry |

**Console log (dev):**
```
📨 EMAIL LOG (Dev Mode): {
  module: 'email',
  operation: 'sendPasswordResetEmail',
  email: 'test@example.com',
  resetUrl: 'http://localhost:3000/auth/reset-password/abc123...',
  ...
}
```

---

### 3. User Invite Email

**How to trigger:**
1. Log in as ADMIN
2. Go to Settings > Team
3. Click "Invite Team Member"
4. Enter email, select role, submit

**Alternatively via API:**
```bash
POST /api/invites
Content-Type: application/json
Authorization: [session cookie]

{
  "email": "newuser@example.com",
  "role": "STAFF",
  "practiceId": "practice-id-here"
}
```

**What to expect:**
| Field | Value |
|-------|-------|
| Recipient | Invited user's email (or DEV_EMAIL_RECIPIENT) |
| Subject | `You've been invited to join [Practice Name]` |
| Preheader | `[Inviter] has invited you to join [Practice] on Venzory.` |
| Main CTA | "Accept Invitation" button |
| Key Data | Invite token URL, 7-day expiry, role assignment |

**Console log (dev):**
```
📨 EMAIL LOG (Dev Mode): {
  module: 'email',
  operation: 'sendUserInviteEmail',
  email: 'newuser@example.com',
  inviteUrl: 'http://localhost:3000/auth/accept-invite/xyz789...',
  ...
}
```

---

### 4. Supplier Order Email

**How to trigger:**
1. Log in as STAFF or ADMIN
2. Create an order for a supplier
3. Click "Send Order"

**Alternatively via code:**
```typescript
// In a server action or API route
import { sendOrderEmail } from '@/src/lib/email/sendOrderEmail';

await sendOrderEmail({
  supplierEmail: 'supplier@example.com',
  supplierName: 'Test Supplier',
  practiceName: 'My Practice',
  practiceAddress: '123 Main St',
  orderReference: 'ORD-001',
  orderNotes: 'Test order',
  items: [
    { name: 'Item 1', sku: 'SKU-001', quantity: 2, unitPrice: 10.00, total: 20.00 }
  ],
  orderTotal: 20.00,
});
```

**What to expect:**
| Field | Value |
|-------|-------|
| Recipient | Supplier's email (or DEV_EMAIL_RECIPIENT) |
| Subject | `New Order from [Practice Name] - [Reference]` |
| Preheader | `New order from [Practice] - [N] items, Total: €[amount]` |
| Main CTA | N/A (informational email) |
| Key Data | Order reference, items table, total, practice address, notes |

**Console log (dev):**
```
📨 EMAIL LOG (Dev Mode): {
  module: 'email',
  operation: 'sendOrderEmail',
  supplierEmail: 'supplier@example.com',
  orderReference: 'ORD-001',
  ...
}
```

---

## Verifying Sandbox Mode

When `DEV_EMAIL_RECIPIENT` is set, check for:

1. **Console log shows redirect:**
   ```
   originalRecipient: 'real-user@example.com',
   actualRecipient: 'dev@venzory.com',
   isRedirected: true,
   ```

2. **Subject includes `[DEV]` prefix:**
   ```
   Subject: [DEV] Reset your Venzory password (was: real-user@example.com)
   ```

3. **All emails arrive at your dev inbox**

---

## Running Unit Tests

```bash
# Run email template tests
npm test -- __tests__/lib/email/email-templates.test.ts

# Run sandbox mode tests
npm test -- __tests__/lib/email/email-sandbox.test.ts

# Run all email-related tests
npm test -- email
```

---

## Troubleshooting

### Emails not sending
- Check `RESEND_API_KEY` is set in `.env.local`
- Check console for `📨 EMAIL LOG` messages
- Verify Resend dashboard for delivery status

### Not receiving emails
- Check `DEV_EMAIL_RECIPIENT` is your email
- Check spam folder
- Look for `[DEV]` prefix in subject

### Wrong recipient in production
- Ensure `NODE_ENV=production`
- Ensure `DEV_EMAIL_RECIPIENT` is NOT set in production

### Template rendering issues
- Use preview mode: `?preview=true`
- Check for missing required fields in payload

