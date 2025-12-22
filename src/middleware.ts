import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

// Security headers for HIPAA/SOC2 compliance
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy - don't leak PHI in URLs
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy - restrict browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.pusher.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.pusher.com wss://*.pusher.com https://api.radar.io " +
      "https://*.carecade.test https://carecade.test " +
      "https://*.empowerhub.test https://empowerhub.test " +
      "https://*.empowerhub.io https://empowerhub.io",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; '),

  // HSTS - Force HTTPS (only in production)
  ...(process.env.NODE_ENV === 'production'
    ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload' }
    : {}),
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response (or pass through)
  const response = NextResponse.next();

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Check if route requires authentication
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset = pathname.includes('.') || pathname.startsWith('/_next');

  // Skip auth check for public routes, API routes, and static assets
  if (isPublicRoute || isApiRoute || isStaticAsset) {
    return response;
  }

  // Check for auth token in cookies or Authorization header
  // Note: Token is stored in localStorage, so we rely on client-side redirect
  // The actual auth check happens in the AuthGuard component

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
