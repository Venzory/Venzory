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

/**
 * Generate a cryptographically random 6-digit login code
 * Range: 100000-999999 (always 6 digits)
 */
function generateLoginCode(): string {
  // Use crypto for better randomness in production
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Map to 100000-999999 range
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}

/**
 * Create a login code for the given email
 * Invalidates any existing unused codes for this email first
 */
async function createLoginCode(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase();
  const code = generateLoginCode();
  
  // Set expiration to 10 minutes from now
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 10);

  // Invalidate any existing unused codes for this email (mark as used)
  await prisma.loginCode.updateMany({
    where: {
      identifier: normalizedEmail,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Create new login code
  await prisma.loginCode.create({
    data: {
      identifier: normalizedEmail,
      code,
      expires,
      attempts: 0,
      used: false,
    },
  });

  return code;
}

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
        const { host } = new URL(url);
        
        // Generate a 6-digit login code as alternative to magic link
        // This provides fallback when links expire or don't work (email scanners, device switching)
        let loginCode: string | null = null;
        try {
          loginCode = await createLoginCode(email);
        } catch (codeError) {
          // Log but don't fail - magic link will still work
          logger.warn({
            module: 'auth',
            operation: 'sendVerificationRequest',
            email,
            error: codeError instanceof Error ? codeError.message : String(codeError),
          }, 'Failed to generate login code, proceeding with magic link only');
        }

        // Apply sandbox mode for non-production - redirect emails to dev inbox
        const devRecipient = process.env.DEV_EMAIL_RECIPIENT;
        const isRedirected = env.NODE_ENV !== 'production' && !!devRecipient;
        const actualRecipient = isRedirected ? devRecipient : email;
        const baseSubject = `Sign in to ${host}`;
        const subject = isRedirected ? `[DEV] ${baseSubject} (was: ${email})` : baseSubject;

        // In development, ALWAYS log the magic link details for visibility
        if (process.env.NODE_ENV === 'development') {
          console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
            module: 'auth',
            operation: 'sendVerificationRequest',
            originalRecipient: email,
            actualRecipient,
            isRedirected,
            subject,
            url,
            loginCode: loginCode ?? 'N/A',
          }, null, 2), '\n');
        }

        // Gracefully handle missing API key if not in development (already logged above for dev)
        if (!env.RESEND_API_KEY) {
           if (process.env.NODE_ENV !== 'development') {
            logger.warn({
              module: 'auth',
              operation: 'sendVerificationRequest',
              email,
              subject,
              url,
              // Don't log code in production
            }, 'Resend not configured - would send magic link');
           }
          return;
        }

        try {
          const { resend } = await import('@/lib/email');
          if (!resend) throw new Error('Resend client not initialized');

          // Build email content with both magic link and login code
          const codeSection = loginCode ? `
                  <tr>
                    <td align="center" style="padding: 24px 20px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 12px 0; font-size: 14px; font-family: Helvetica, Arial, sans-serif; color: #6b7280;">
                        Or enter this code on the login page:
                      </p>
                      <div style="font-size: 32px; font-family: 'Courier New', monospace; letter-spacing: 8px; color: #1f2937; font-weight: bold; background: #f3f4f6; padding: 16px 24px; border-radius: 8px; display: inline-block;">
                        ${loginCode}
                      </div>
                      <p style="margin: 12px 0 0 0; font-size: 12px; font-family: Helvetica, Arial, sans-serif; color: #9ca3af;">
                        This code expires in 10 minutes
                      </p>
                    </td>
                  </tr>
          ` : '';

          const textCodeSection = loginCode 
            ? `\n\nOr enter this code on the login page: ${loginCode}\n(Code expires in 10 minutes)` 
            : '';

          const { data, error } = await resend.emails.send({
            from: `Venzory <${env.EMAIL_FROM}>`,
            to: actualRecipient,
            subject,
            text: `Sign in to ${host}\n\nClick this link to sign in:\n${url}${textCodeSection}\n\nIf you did not request this email, you can safely ignore it.`,
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
                  ${codeSection}
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
            originalRecipient: email,
            actualRecipient,
            isRedirected,
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
                  select: { 
                    id: true, 
                    name: true, 
                    slug: true, 
                    onboardingCompletedAt: true, 
                    onboardingSkippedAt: true,
                    locations: {
                      select: { id: true, name: true },
                      orderBy: { name: 'asc' },
                    },
                  },
                },
                locationAccess: {
                  select: { locationId: true },
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
    async jwt({ token, user, trigger, session: updateData }) {
      // Call base logic from authConfig if needed, but here we just duplicate/override for simplicity
      // because we need full control and authConfig.jwt is basic.
      
      // Handle session update with new active practice/location
      if (trigger === 'update' && updateData) {
        if (updateData.activePracticeId !== undefined) {
          token.activePracticeId = updateData.activePracticeId;
        }
        if (updateData.activeLocationId !== undefined) {
          token.activeLocationId = updateData.activeLocationId;
        }
      }
      
      if (user) {
        // Store user data in token on initial sign in
        token.userId = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        
        const memberships = (user as any).memberships ?? [];
        const firstMembership = memberships[0];
        
        token.activePracticeId = firstMembership?.practiceId ?? null;
        token.memberships = memberships.map((m: any) => {
          // Get allowed location IDs from explicit access or all locations for OWNER/ADMIN
          const practiceLocations = m.practice?.locations ?? [];
          const explicitLocationIds = m.locationAccess?.map((la: any) => la.locationId) ?? [];
          
          // OWNER and ADMIN have access to all locations; others need explicit assignment
          const isFullAccess = m.role === 'OWNER' || m.role === 'ADMIN';
          const allowedLocationIds = isFullAccess 
            ? practiceLocations.map((loc: any) => loc.id)
            : explicitLocationIds;
          
          return {
            id: m.id,
            practiceId: m.practiceId,
            role: m.role,
            status: m.status,
            practice: {
              id: m.practice.id,
              name: m.practice.name,
              slug: m.practice.slug,
              onboardingCompletedAt: m.practice.onboardingCompletedAt,
              onboardingSkippedAt: m.practice.onboardingSkippedAt,
            },
            allowedLocationIds,
            locations: practiceLocations.map((loc: any) => ({ id: loc.id, name: loc.name })),
          };
        });
        
        // Set initial active location to first allowed location of first practice
        const firstAllowedLocationId = (token.memberships as any[])?.[0]?.allowedLocationIds?.[0] ?? null;
        token.activeLocationId = firstAllowedLocationId;
      }

      // Refetch user data on update to get fresh onboarding status and location access
      if (trigger === 'update' && token.userId) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          include: {
            memberships: {
              include: {
                practice: {
                  select: { 
                    id: true, 
                    name: true, 
                    slug: true, 
                    onboardingCompletedAt: true, 
                    onboardingSkippedAt: true,
                    locations: {
                      select: { id: true, name: true },
                      orderBy: { name: 'asc' },
                    },
                  },
                },
                locationAccess: {
                  select: { locationId: true },
                },
              },
            },
          },
        });

        if (freshUser) {
          token.memberships = freshUser.memberships.map((m: any) => {
            const practiceLocations = m.practice?.locations ?? [];
            const explicitLocationIds = m.locationAccess?.map((la: any) => la.locationId) ?? [];
            const isFullAccess = m.role === 'OWNER' || m.role === 'ADMIN';
            const allowedLocationIds = isFullAccess 
              ? practiceLocations.map((loc: any) => loc.id)
              : explicitLocationIds;
            
            return {
              id: m.id,
              practiceId: m.practiceId,
              role: m.role,
              status: m.status,
              practice: {
                id: m.practice.id,
                name: m.practice.name,
                slug: m.practice.slug,
                onboardingCompletedAt: m.practice.onboardingCompletedAt,
                onboardingSkippedAt: m.practice.onboardingSkippedAt,
              },
              allowedLocationIds,
              locations: practiceLocations.map((loc: any) => ({ id: loc.id, name: loc.name })),
            };
          });
          
          // Preserve activeLocationId if still valid, otherwise reset
          const currentPractice = token.memberships?.find((m: any) => m.practiceId === token.activePracticeId);
          const currentLocationId = token.activeLocationId as string | null | undefined;
          if (currentPractice && (!currentLocationId || !currentPractice.allowedLocationIds.includes(currentLocationId))) {
            token.activeLocationId = currentPractice.allowedLocationIds[0] ?? null;
          }
        }
      }

      return token;
    },
  },
});
