import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { loginRateLimiter, getClientIp } from '@/lib/rate-limit';

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
  // Session Security:
  // - 30-day max session lifetime
  // - Session refreshes every 24h of activity
  // - TODO: Implement session rotation on privilege changes (role/practice switches)
  //   See jwt callback for where to trigger rotation via trigger === 'update'
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours of activity
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  // Cookie Security Configuration
  // - httpOnly: prevents JavaScript access (XSS protection)
  // - sameSite: 'lax' protects against CSRF while allowing normal navigation
  // - secure: true in production ensures HTTPS-only transmission
  // - __Secure- prefix in production enforces secure flag at browser level
  cookies: {
    sessionToken: {
      name:
        env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;

        // Enforce rate limiting
        // Use the request object if available to get client IP
        let ip = 'unknown';
        if (request instanceof Request) {
          ip = getClientIp(request);
        }
        
        const rateLimitKey = `${ip}:${email}`;
        const rateLimitResult = await loginRateLimiter.check(rateLimitKey);

        if (!rateLimitResult.success) {
          // Note: NextAuth handles errors thrown here.
          // Depending on version/config, this might show as a generic error or a specific one.
          // For security, we should probably just fail without detailed limit info leaks if possible,
          // but internally we want to track it.
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
    async jwt({ token, user, trigger }) {
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
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.userId as string,
          name: token.name as string | null,
          email: token.email as string,
          emailVerified: null,
          image: token.image as string | null,
          activePracticeId: token.activePracticeId as string | null,
          memberships: token.memberships as any[],
        };
      }
      return session;
    },
  },
});

