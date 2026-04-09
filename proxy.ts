import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

// CSRF Protection Constants
const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

// ============================================
// RATE LIMITING
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  return ip;
}

function checkRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: record.resetTime - now
  };
}

// ============================================
// CSRF & AUTH HELPERS
// ============================================

function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// Routes cần authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/inventory",
  "/goods-receipt",
  "/goods-issue",
  "/purchase-order",
  "/stocktake",
  "/suppliers",
  "/reports",
  "/settings",
];

// Routes không cần authentication
const PUBLIC_ROUTES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/auth/session",
  "/_next/",
  "/static/",
  "/favicon",
  "/manifest.json",
  "/icons/",
];

// Public API routes - cho phép GET mà không cần auth
const PUBLIC_API_ROUTES = [
  "/api/products",
  "/api/inventory",
  "/api/suppliers",
  "/api/warehouses",
  "/api/goods-receipt",
  "/api/goods-issue",
  "/api/purchase-order",
  "/api/stocktake",
  "/api/dashboard",
];

// Mobile routes - vẫn cần auth nhưng có thể redirect khác
const MOBILE_ROUTES = [
  "/mobile",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and other non-page routes
  const isExcludedPath = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isExcludedPath) {
    return NextResponse.next();
  }

  // ============================================
  // PUBLIC API GET ROUTES - Skip auth/CSRF
  // ============================================
  if (request.method === "GET" && PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    // Allow GET requests to public API routes without auth check
    return NextResponse.next();
  }

  // ============================================
  // RATE LIMITING (chỉ cho /api/* routes)
  // ============================================

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const key = getRateLimitKey(request);

    // Giới hạn khác nhau cho từng loại:
    // - Auth endpoints: 10 requests/minute (chống brute force)
    // - Mutation (POST/PUT/DELETE): 60 requests/minute
    // - GET: 100 requests/minute
    let limit = 100;
    if (request.nextUrl.pathname.startsWith("/api/auth/")) {
      limit = 10;
    } else if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      limit = 60;
    }

    const { allowed, remaining, resetIn } = checkRateLimit(key, limit);

    if (!allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          }
        }
      );
    }

    // Thêm headers thông tin rate limit vào response
    const rateLimitResponse = NextResponse.next();
    rateLimitResponse.headers.set("X-RateLimit-Limit", String(limit));
    rateLimitResponse.headers.set("X-RateLimit-Remaining", String(remaining));
    return rateLimitResponse;
  }

  // ============================================
  // CSRF PROTECTION
  // ============================================

  // 1. GET requests - set CSRF cookie if not exists
  if (request.method === "GET") {
    const response = NextResponse.next();
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get(CSRF_COOKIE);

    if (!csrfCookie) {
      response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
        httpOnly: false, // Frontend needs to read this
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }
    return response;
  }

  // 2. Mutation requests to /api/* - validate CSRF token
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && pathname.startsWith("/api/")) {
    // Skip CSRF for auth endpoints (login, logout, csrf)
    const isAuthEndpoint = pathname.startsWith("/api/auth/");
    if (!isAuthEndpoint) {
      const csrfHeader = request.headers.get(CSRF_HEADER);
      const cookieStore = await cookies();
      const csrfCookie = cookieStore.get(CSRF_COOKIE)?.value;

      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }
    }
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  // Check authentication - ưu tiên kiểm tra session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  const authHeader = request.headers.get("authorization");

  // Trong dev mode, cho phép truy cập nếu có session hoặc auth header
  // Trong production, nên kiểm tra session hợp lệ
  const isAuthenticated = sessionCookie || authHeader?.startsWith("Bearer ");

  // Kiểm tra xem route có cần auth không
  const needsAuth = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // Nếu route cần auth nhưng chưa đăng nhập
  if (needsAuth && !isAuthenticated) {
    // Trong development, có thể bỏ qua auth check
    // Trong production, uncomment dòng dưới:
    // return NextResponse.redirect(new URL("/login", request.url));

    // Dev mode: cho phép truy cập nhưng log warning
    console.warn(`[AUTH] Access to ${pathname} without authentication (dev mode)`);
  }

  // Thêm security headers
  const response = NextResponse.next();

  // Prevent XSS
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Content type sniffing protection
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Platform indicator
  response.headers.set("X-Platform", "warehouse-management");

  // CSP headers (trong production, nên cấu hình chi tiết hơn)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - handled separately
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons (PWA icons)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icons|.*\\..*).*)",
  ],
};
