import type { NextAuthConfig } from 'next-auth';
import { env } from '@/lib/env';

export const authConfig = {
  // Session Security:
  // - 30-day max session lifetime
  // - Session refreshes every 24h of activity
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours of activity
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  // Cookie Security Configuration
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
    verifyRequest: '/auth/verify-request',
  },
  providers: [], // Configured in auth.ts
  callbacks: {
    // Simple session callback that doesn't rely on DB
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.userId as string,
          name: token.name as string | null,
          email: token.email as string,
          emailVerified: null,
          image: token.image as string | null,
          activePracticeId: token.activePracticeId as string | null,
          activeLocationId: token.activeLocationId as string | null,
          memberships: (token.memberships as any[]) || [],
        };
      }
      return session;
    },
    // Base JWT callback - extended in auth.ts for DB updates
    async jwt({ token, user }) {
      if (user) {
        // Store user data in token on initial sign in
        token.userId = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.activePracticeId = (user as any).memberships?.[0]?.practiceId ?? null;
        token.activeLocationId = null; // Will be set properly in auth.ts
        token.memberships = (user as any).memberships?.map((m: any) => ({
          id: m.id,
          practiceId: m.practiceId,
          role: m.role,
          status: m.status,
          practice: m.practice,
          allowedLocationIds: [],
          locations: [],
        })) ?? [];
      }
      return token;
    },
  },
} satisfies NextAuthConfig;

