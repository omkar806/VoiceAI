import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/register'];

// Middleware function
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;
  
  // If the path is public, allow access
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    // If user is already logged in, redirect to home or organizations
    if (token) {
      const organizationId = request.cookies.get('current_organization')?.value;
      if (organizationId) {
        return NextResponse.redirect(new URL('/', request.url));
      } else {
        return NextResponse.redirect(new URL('/organizations', request.url));
      }
    }
    return NextResponse.next();
  }
  
  // For protected routes, check if user is authenticated
  if (!token) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Organization related routes, check for current organization
  if (pathname === '/' || pathname.includes('/projects')) {
    const currentOrganization = request.cookies.get('current_organization')?.value;
    if (!currentOrganization) {
      return NextResponse.redirect(new URL('/organizations', request.url));
    }
  }
  
  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    // Routes that require authentication
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 