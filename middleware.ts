import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { checkRouteAccess } from '@/lib/route-guards';

const protectedMatchers = ['/dashboard', '/inventory', '/suppliers', '/orders', '/locations', '/settings', '/receiving', '/stock-count', '/products', '/catalog', '/my-catalog'];
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

  // For authenticated users on protected routes, check role-based access
  if (request.auth && isProtected) {
    const { allowed } = checkRouteAccess({
      pathname,
      session: request.auth,
    });

    if (!allowed) {
      // Redirect to access denied page
      const accessDeniedUrl = new URL('/access-denied', request.nextUrl.origin);
      accessDeniedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(accessDeniedUrl);
    }
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
