import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Add paths that should not be protected
const publicPaths = ['/login', '/favicon.ico', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, Next.js internal paths, static files, and public paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.includes(pathname);
  
  const refreshToken = request.cookies.get('refreshToken')?.value;

  let isValid = false;
  if (refreshToken) {
    try {
      const secretKey = process.env.JWT_REFRESH_SECRET;
      if (!secretKey) {
        throw new Error('JWT_REFRESH_SECRET is not configured in the environment');
      }
      const secret = new TextEncoder().encode(secretKey);
      await jwtVerify(refreshToken, secret);
      isValid = true;
    } catch (e) {
      // Invalid signature, expired, malformed, or missing environment variable
      console.error('Middleware token validation failed:', e);
      isValid = false;
    }
  }

  // If trying to access a protected route without a valid token, redirect to login
  if (!isPublicPath && !isValid) {
    const loginUrl = new URL('/login', request.url);
    // Optionally preserve the attempted URL
    // loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login while already authenticated, redirect to dashboard
  if (isPublicPath && isValid && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except API and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
