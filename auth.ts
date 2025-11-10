import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

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

