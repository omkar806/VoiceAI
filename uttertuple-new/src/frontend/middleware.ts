import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || 
                       path === '/register' || 
                       path === '/confirm' || 
                       path.startsWith('/_next') || 
                       path.startsWith('/api/') ||
                       path === '/favicon.ico';

  // Check if user is authenticated by looking for the token
  const token = request.cookies.get('access_token')?.value || '';
  
  // If the path is public and user is authenticated, allow access to auth pages
  if (isPublicPath && token) {
    // Allow access to auth pages even if authenticated
    return NextResponse.next();
  }
  
  // If the path is not public and user is not authenticated, redirect to login
  if (!isPublicPath && !token) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  
  // For all other cases, proceed normally
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     */
    '/((?!api|_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}; 