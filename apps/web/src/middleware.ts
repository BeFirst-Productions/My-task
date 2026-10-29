import { NextResponse, type NextRequest } from "next/server";

/**
 * Enterprise Multi-Tenant SaaS Edge Authentication & Security Middleware
 *
 * Runs at the network edge BEFORE any page is rendered.
 * Prevents unauthenticated users from viewing or loading protected dashboards
 * when copying/pasting URLs directly into browser address bars.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("saas_auth_token")?.value;

  // Determine if the current route is an internal protected workspace or dashboard
  const isProtectedRoute =
    pathname.startsWith("/org") ||
    pathname.startsWith("/platform-owner") ||
    pathname.startsWith("/platform-admin") ||
    pathname.startsWith("/dashboard");

  // 1. Guard protected routes against unauthenticated access
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    const destination = pathname + search;
    if (destination && destination !== "/" && destination !== "/org/dashboard") {
      loginUrl.searchParams.set("redirect", destination);
    }
    // Perform clean 307 temporary redirect to login
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // 2. If user already has an active session and visits /login, redirect to their workspace
  if (token && pathname === "/login") {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
  }

  // 3. Attach standard enterprise HTTP security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (Fastify proxy)
     * - _next/static (static build assets)
     * - _next/image (image optimization files)
     * - Static asset extensions (.png, .jpg, .jpeg, .svg, .ico, .webp)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

