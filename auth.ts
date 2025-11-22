import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { loginRateLimiter, getClientIp } from '@/lib/rate-limit';
import { authConfig } from './auth.config';

import logger from '@/lib/logger';

// Schema for login validation only.
const credentialsSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(6),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  // Adapter required for Magic Links (stores VerificationTokens in DB)
  adapter: PrismaAdapter(prisma),
  providers: [
    // Magic Link / Email Provider
    Resend({
      from: env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        // In development, ALWAYS log the magic link details for visibility
        if (process.env.NODE_ENV === 'development') {
          const { host } = new URL(url);
          console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
            module: 'auth',
            operation: 'sendVerificationRequest',
            email,
            subject: `Sign in to ${host}`,
            url,
          }, null, 2), '\n');
        }

        // Gracefully handle missing API key if not in development (already logged above for dev)
        if (!env.RESEND_API_KEY) {
           if (process.env.NODE_ENV !== 'development') {
            const { host } = new URL(url);
            logger.warn({
              module: 'auth',
              operation: 'sendVerificationRequest',
              email,
              subject: `Sign in to ${host}`,
              url,
            }, 'Resend not configured - would send magic link');
           }
          return;
        }

        try {
          const { resend } = await import('@/lib/email');
          if (!resend) throw new Error('Resend client not initialized');

          const { host } = new URL(url);

          const { data, error } = await resend.emails.send({
            from: provider.from || 'Venzory <noreply@venzory.com>',
            to: email,
            subject: `Sign in to ${host}`,
            text: `Sign in to ${host}\n${url}\n\n`,
            html: `
              <body style="background: #f9f9f9;">
                <table width="100%" border="0" cellspacing="20" cellpadding="0"
                  style="background: #fff; max-width: 600px; margin: auto; border-radius: 10px;">
                  <tr>
                    <td align="center"
                      style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
                      Sign in to <strong>${host}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="border-radius: 5px;" bgcolor="#0ea5e9">
                            <a href="${url}"
                              target="_blank"
                              style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid #0ea5e9; display: inline-block; font-weight: bold;">
                              Sign in
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center"
                      style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
                      If you did not request this email, you can safely ignore it.
                    </td>
                  </tr>
                </table>
              </body>
            `,
          });

          if (error) {
            logger.error({ 
              module: 'auth',
              operation: 'sendVerificationRequest',
              email,
              resendError: error
            }, 'Resend API returned error for magic link');
            throw new Error(`Failed to send verification email: ${error.message}`);
          }

          logger.info({
            module: 'auth',
            operation: 'sendVerificationRequest',
            email,
            messageId: data?.id,
          }, 'Magic link sent successfully via Resend');

        } catch (error) {
          logger.error({ 
            module: 'auth',
            operation: 'sendVerificationRequest',
            error: error instanceof Error ? error.message : String(error) 
          }, 'Failed to send verification email');
          throw new Error('Failed to send verification email');
        }
      },
    }),
    // Password Provider
    Credentials({
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;
        
        // Enforce rate limiting
        let ip = 'unknown';
        if (request instanceof Request) {
          ip = getClientIp(request);
        }
        
        const rateLimitKey = `${ip}:${email}`;
        const rateLimitResult = await loginRateLimiter.check(rateLimitKey);

        if (!rateLimitResult.success) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                practice: {
                  select: { id: true, name: true, slug: true, onboardingCompletedAt: true, onboardingSkippedAt: true },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // Call base logic from authConfig if needed, but here we just duplicate/override for simplicity
      // because we need full control and authConfig.jwt is basic.
      
      if (user) {
        // Store user data in token on initial sign in
        token.userId = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.activePracticeId = (user as any).memberships?.[0]?.practiceId ?? null;
        token.memberships = (user as any).memberships?.map((m: any) => ({
          id: m.id,
          practiceId: m.practiceId,
          role: m.role,
          status: m.status,
          practice: m.practice,
        })) ?? [];
      }

      // Refetch user data on update to get fresh onboarding status
      if (trigger === 'update' && token.userId) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          include: {
            memberships: {
              include: {
                practice: {
                  select: { id: true, name: true, slug: true, onboardingCompletedAt: true, onboardingSkippedAt: true },
                },
              },
            },
          },
        });

        if (freshUser) {
          token.memberships = freshUser.memberships.map((m: any) => ({
            id: m.id,
            practiceId: m.practiceId,
            role: m.role,
            status: m.status,
            practice: m.practice,
          }));
        }
      }

      return token;
    },
  },
});
