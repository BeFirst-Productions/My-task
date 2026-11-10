import { NextResponse, type NextRequest } from "next/server";

/**
 * Extracts the tenant subdomain from the incoming Host header.
 * Supports:
 * - Production wildcard subdomains (e.g. ibh.yourdomain.com -> "ibh")
 * - Local development subdomains (e.g. ibh.localhost:3000 -> "ibh", ibh.lvh.me:3000 -> "ibh")
 * Returns null if the request is on the root domain (e.g. yourdomain.com, www.yourdomain.com, localhost)
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null;
  const cleanHost = host.split(":")[0].toLowerCase();

  // Local development support (e.g. ibh.localhost or ibh.lvh.me)
  if (cleanHost.endsWith(".localhost")) {
    return cleanHost.replace(".localhost", "");
  }
  if (cleanHost.endsWith(".lvh.me")) {
    return cleanHost.replace(".lvh.me", "");
  }

  // Direct IP addresses or plain localhost have no subdomain
  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)
  ) {
    return null;
  }

  // Ignore Vercel internal preview deployments (e.g. my-task-gules.vercel.app)
  if (cleanHost.endsWith(".vercel.app")) {
    return null;
  }

  // Production wildcard domain check:
  // e.g. "ibh.yourdomain.com" -> parts: ["ibh", "yourdomain", "com"]
  const parts = cleanHost.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== "www") {
      return sub;
    }
  }

  return null;
}

/**
 * Enterprise Multi-Tenant SaaS Edge Authentication & Subdomain Routing Middleware
 *
 * Runs at the network edge BEFORE any page is rendered.
 * Automatically handles:
 * 1. Wildcard Subdomain dynamic rewrites (e.g. ibh.domain.com/dashboard -> /org/ibh/dashboard)
 * 2. Platform Owner portal routing (e.g. admin.domain.com -> /platform-owner)
 * 3. Protected route authentication verification & security headers
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const token = request.cookies.get("saas_auth_token")?.value;
  const subdomain = extractSubdomain(host);

  // ── 1. Tenant & Role Subdomain Rewrites ─────────────────────────────────────────

  // Case A: Platform Admin Subdomain (e.g. admin.yourdomain.com or platform.yourdomain.com)
  if (subdomain === "admin" || subdomain === "platform") {
    // If not authenticated, redirect to login with return target
    if (!token && pathname !== "/login") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/platform-owner");
      return NextResponse.redirect(loginUrl);
    }
    // Rewrite root or /dashboard on admin subdomain to platform owner view
    if (pathname === "/" || pathname === "/dashboard") {
      const rewriteUrl = new URL(`/platform-owner${search}`, request.url);
      const res = NextResponse.rewrite(rewriteUrl);
      applySecurityHeaders(res);
      return res;
    }
  }

  // Case B: Organization Tenant Subdomain (e.g. ibh.yourdomain.com, acme.yourdomain.com)
  if (subdomain && subdomain !== "admin" && subdomain !== "platform") {
    // Unauthenticated tenant visitors trying to access dashboard -> redirect to login
    if (!token && pathname !== "/login") {
      const loginUrl = new URL("/login", request.url);
      const destination = pathname + search;
      if (destination && destination !== "/") {
        loginUrl.searchParams.set("redirect", destination);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Rewrite root or /dashboard on tenant subdomain to that organization's workspace
    if (pathname === "/" || pathname === "/dashboard") {
      const rewriteUrl = new URL(`/org/${subdomain}/dashboard${search}`, request.url);
      const res = NextResponse.rewrite(rewriteUrl);
      res.headers.set("x-tenant-subdomain", subdomain);
      applySecurityHeaders(res);
      return res;
    }

    // Rewrite other clean sub-paths on tenant domain (e.g. /settings, /clients) to /org/subdomain/...
    if (
      !pathname.startsWith("/org") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      pathname !== "/login"
    ) {
      const rewriteUrl = new URL(`/org/${subdomain}${pathname}${search}`, request.url);
      const res = NextResponse.rewrite(rewriteUrl);
      res.headers.set("x-tenant-subdomain", subdomain);
      applySecurityHeaders(res);
      return res;
    }
  }

  // ── 2. Standard Root Domain Route Protection ──────────────────────────────────
  const isProtectedRoute =
    pathname.startsWith("/org") ||
    pathname.startsWith("/platform-owner") ||
    pathname.startsWith("/platform-admin") ||
    pathname.startsWith("/dashboard");

  // Guard protected routes against unauthenticated access
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    const destination = pathname + search;
    if (destination && destination !== "/" && destination !== "/org/dashboard") {
      loginUrl.searchParams.set("redirect", destination);
    }
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // If user already has an active session and visits /login, redirect to their workspace
  if (token && pathname === "/login") {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
  }

  // ── 3. Attach Security Headers ────────────────────────────────────────────────
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
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

