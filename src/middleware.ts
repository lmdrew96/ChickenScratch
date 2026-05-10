import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/published(.*)',
  '/about(.*)',
  '/contact(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/contact(.*)',
  '/issues(.*)',
  '/events(.*)',
  '/exhibition',
  '/maintenance'
]);

const isMaintenanceBypass = createRouteMatcher([
  '/maintenance',
  '/login(.*)',
  '/signup(.*)',
  '/admin(.*)',
  '/api/(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (process.env.MAINTENANCE_MODE === 'true' && !isMaintenanceBypass(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/maintenance';
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-maintenance-active', '1');
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
      status: 503,
    });
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
