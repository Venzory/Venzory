import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge-compatible auth instance
export const { auth } = NextAuth({
  ...authConfig,
});

