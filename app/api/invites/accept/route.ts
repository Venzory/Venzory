import { NextResponse } from 'next/server';
import { z } from 'zod';

import { signIn } from '@/auth';
import { getAuthService } from '@/src/services';
import { inviteAcceptRateLimiter, getClientIp } from '@/lib/rate-limit';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { token, name, password } = parsed.data;

    // Rate limiting: Check based on IP and token
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${token}`;
    const rateLimitResult = await inviteAcceptRateLimiter.check(rateLimitKey);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        },
      );
    }

    // Accept invite using AuthService
    const result = await getAuthService().acceptInvite(token, name, password);

    // Get the email from the accepted invite for sign-in
    const invite = await getAuthService().validateInviteToken(token);

    // Sign the user in
    try {
      await signIn('credentials', {
        email: invite.email,
        password,
        redirect: false,
      });
    } catch (signInError) {
      // If sign-in fails, log it but still return success since account was created
      console.error('[accept-invite] Auto sign-in failed:', signInError);
      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully. Please sign in.',
          redirectTo: '/login',
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation accepted successfully',
        redirectTo: result.redirectTo,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[accept-invite]', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid invitation')) {
        return NextResponse.json(
          { error: 'Invalid invitation token' },
          { status: 404 },
        );
      }
      if (error.message.includes('already been used')) {
        return NextResponse.json(
          { error: 'This invitation has already been used' },
          { status: 409 },
        );
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 410 },
        );
      }
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          { error: 'You are already a member of this practice' },
          { status: 409 },
        );
      }
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while accepting the invitation' },
      { status: 500 },
    );
  }
}

