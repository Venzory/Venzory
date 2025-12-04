/**
 * Email Smoke Test Route (Development Only)
 * 
 * This route allows manual testing of all email types in development.
 * It ALWAYS respects the sandbox mode (DEV_EMAIL_RECIPIENT).
 * 
 * SECURITY: This route is disabled in production via explicit NODE_ENV check.
 * 
 * Usage:
 *   GET /api/debug/email-smoke-test?type=password_reset
 *   GET /api/debug/email-smoke-test?type=user_invite
 *   GET /api/debug/email-smoke-test?type=order
 * 
 * Query Parameters:
 *   type - Email type to test (password_reset | user_invite | order)
 *   preview - If "true", returns HTML preview without sending (default: false)
 * 
 * Requirements:
 *   - NODE_ENV must be 'development' or 'test'
 *   - RESEND_API_KEY must be set to actually send
 *   - DEV_EMAIL_RECIPIENT should be set to receive the test emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Import email functions
import { sendPasswordResetEmail, sendUserInviteEmail } from '@/lib/email';
import { sendOrderEmail } from '@/src/lib/email/sendOrderEmail';

// Import templates for preview mode
import {
  renderPasswordResetEmailHtml,
  renderUserInviteEmailHtml,
  renderOrderEmailHtml,
  renderMagicLinkEmailHtml,
} from '@/src/lib/email/templates';

export const dynamic = 'force-dynamic';

/**
 * Test data payloads for each email type
 */
const TEST_PAYLOADS = {
  password_reset: {
    email: 'test-user@example.com',
    token: 'smoke-test-token-' + Date.now(),
    name: 'Test User',
  },
  user_invite: {
    email: 'invited-user@example.com',
    token: 'invite-token-' + Date.now(),
    practiceName: 'Smoke Test Practice',
    role: 'STAFF' as const,
    inviterName: 'Test Admin',
  },
  order: {
    supplierEmail: 'supplier@example.com',
    supplierName: 'Test Supplier Inc.',
    practiceName: 'Smoke Test Veterinary',
    practiceAddress: '123 Test Street\nTest City, TC 12345',
    orderReference: 'SMOKE-TEST-' + Date.now(),
    orderNotes: 'This is a smoke test order. Please ignore.',
    items: [
      { name: 'Test Product A', sku: 'TEST-A-001', quantity: 5, unitPrice: 10.00, total: 50.00 },
      { name: 'Test Product B', sku: null, quantity: 2, unitPrice: 25.50, total: 51.00 },
      { name: 'Test Product C', sku: 'TEST-C-003', quantity: 1, unitPrice: 99.99, total: 99.99 },
    ],
    orderTotal: 200.99,
  },
  magic_link: {
    host: 'app.venzory.com',
    url: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/resend?token=smoke-test-${Date.now()}`,
    loginCode: '123456',
  },
};

export async function GET(request: NextRequest) {
  // ============================================
  // SECURITY: Block in production
  // ============================================
  if (env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Email smoke test is disabled in production' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const emailType = searchParams.get('type');
  const previewOnly = searchParams.get('preview') === 'true';

  // Validate email type
  if (!emailType || !['password_reset', 'user_invite', 'order', 'magic_link'].includes(emailType)) {
    return NextResponse.json({
      error: 'Invalid or missing email type',
      usage: {
        endpoint: '/api/debug/email-smoke-test',
        queryParams: {
          type: 'password_reset | user_invite | order | magic_link',
          preview: 'true (optional - returns HTML preview without sending)',
        },
        example: '/api/debug/email-smoke-test?type=password_reset',
        note: 'DEV_EMAIL_RECIPIENT should be set in .env.local to receive test emails',
      },
      available_types: Object.keys(TEST_PAYLOADS),
    }, { status: 400 });
  }

  // Check if DEV_EMAIL_RECIPIENT is set (recommended for testing)
  const devRecipient = process.env.DEV_EMAIL_RECIPIENT;
  if (!devRecipient && !previewOnly) {
    return NextResponse.json({
      warning: 'DEV_EMAIL_RECIPIENT is not set',
      message: 'Set DEV_EMAIL_RECIPIENT in .env.local to safely test emails.',
      suggestion: 'Add to .env.local: DEV_EMAIL_RECIPIENT=your-email@example.com',
      preview_available: 'Add ?preview=true to see the email HTML without sending',
    }, { status: 400 });
  }

  try {
    // ============================================
    // Preview Mode: Return HTML without sending
    // ============================================
    if (previewOnly) {
      let html: string;
      let subject: string;
      
      switch (emailType) {
        case 'password_reset':
          html = renderPasswordResetEmailHtml({
            name: TEST_PAYLOADS.password_reset.name,
            resetUrl: `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${TEST_PAYLOADS.password_reset.token}`,
          });
          subject = 'Reset your Venzory password';
          break;
          
        case 'user_invite':
          html = renderUserInviteEmailHtml({
            ...TEST_PAYLOADS.user_invite,
            inviteUrl: `${env.NEXT_PUBLIC_APP_URL}/auth/accept-invite/${TEST_PAYLOADS.user_invite.token}`,
          });
          subject = `You've been invited to join ${TEST_PAYLOADS.user_invite.practiceName}`;
          break;
          
        case 'order':
          html = renderOrderEmailHtml(TEST_PAYLOADS.order);
          subject = `New Order from ${TEST_PAYLOADS.order.practiceName} - ${TEST_PAYLOADS.order.orderReference}`;
          break;
          
        case 'magic_link':
          html = renderMagicLinkEmailHtml(TEST_PAYLOADS.magic_link);
          subject = `Sign in to ${TEST_PAYLOADS.magic_link.host}`;
          break;
          
        default:
          throw new Error(`Unknown type: ${emailType}`);
      }

      // Return HTML preview
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Email-Subject': subject,
          'X-Email-Type': emailType,
        },
      });
    }

    // ============================================
    // Send Mode: Actually send the email
    // ============================================
    let result: { success: boolean; error?: string };
    let recipientInfo: string;
    
    switch (emailType) {
      case 'password_reset':
        result = await sendPasswordResetEmail(TEST_PAYLOADS.password_reset);
        recipientInfo = TEST_PAYLOADS.password_reset.email;
        break;
        
      case 'user_invite':
        result = await sendUserInviteEmail(TEST_PAYLOADS.user_invite);
        recipientInfo = TEST_PAYLOADS.user_invite.email;
        break;
        
      case 'order':
        result = await sendOrderEmail(TEST_PAYLOADS.order);
        recipientInfo = TEST_PAYLOADS.order.supplierEmail;
        break;
        
      case 'magic_link':
        // Magic link uses a different flow (NextAuth), so we just preview it
        return NextResponse.json({
          message: 'Magic link emails are sent via NextAuth flow',
          suggestion: 'Use ?preview=true to see the template, or trigger via login page',
          preview_url: `/api/debug/email-smoke-test?type=magic_link&preview=true`,
        });
        
      default:
        throw new Error(`Unknown type: ${emailType}`);
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        type: emailType,
        note: 'Check that RESEND_API_KEY is set in .env.local',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type: emailType,
      originalRecipient: recipientInfo,
      actualRecipient: devRecipient || recipientInfo,
      isRedirected: !!devRecipient,
      message: devRecipient 
        ? `Test email sent to ${devRecipient} (redirected from ${recipientInfo})`
        : `Test email sent to ${recipientInfo}`,
      note: 'Check your inbox! Subject will include [DEV] prefix if redirected.',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      type: emailType,
    }, { status: 500 });
  }
}

