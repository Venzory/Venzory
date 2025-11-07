import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { loginRateLimiter } from '@/lib/rate-limit';

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
  session: { strategy: 'jwt' },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
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

        // Rate limiting based on email
        // Note: In production, you'd also want IP-based limiting at the reverse proxy level
        const rateLimitResult = await loginRateLimiter.check(email);
        if (!rateLimitResult.success) {
          console.warn(`[Auth] Rate limit exceeded for email: ${email}`);
          // Return null to fail authentication (NextAuth doesn't support custom error responses in authorize)
          return null;
        }

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

