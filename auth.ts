import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

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

        // Note: Rate limiting for login is handled at the API route level
        // See app/api/auth/[...nextauth]/route.ts

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                practice: {
                  select: { id: true, name: true, slug: true },
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
      // TODO: On role/practice changes, validate and possibly invalidate old token
      // This would be triggered via trigger === 'update' when calling update() on the session
      // Example implementation:
      // if (trigger === 'update' && token.activePracticeId !== updatedPracticeId) {
      //   // Could force re-authentication or generate new token with updated claims
      //   // For now, we update the token directly, but consider security implications
      // }
      
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

