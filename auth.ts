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
