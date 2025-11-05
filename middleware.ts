import { NextResponse } from 'next/server';

import { auth } from '@/auth';

const protectedMatchers = ['/dashboard', '/inventory', '/suppliers', '/orders', '/locations', '/settings'];
const authRoutes = ['/login', '/register'];

export default auth((request) => {
  const { pathname } = request.nextUrl;

  const isProtected = protectedMatchers.some((path) => pathname.startsWith(path));
  const isAuthRoute = authRoutes.some((path) => pathname === path);

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (request.auth && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!request.auth && isProtected) {
    const signInUrl = new URL('/login', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
