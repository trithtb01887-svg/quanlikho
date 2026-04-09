import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF Protection Middleware
 * Verifies that state-changing requests (POST, PUT, PATCH, DELETE)
 * have a valid CSRF token
 */

const CSRF_TOKEN_COOKIE_NAME = "csrf-token";
const CSRF_TOKEN_HEADER = "x-csrf-token";
const ORIGIN_HEADER = "origin";
const REFERER_HEADER = "referer";

// Routes that don't require CSRF verification (public APIs)
const EXCLUDED_ROUTES = [
  "/api/auth/login",
  "/api/auth/logout",
];

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some((route) => pathname.startsWith(route));
}

function isSafeMethod(method: string): boolean {
  return ["GET", "HEAD", "OPTIONS"].includes(method);
}

export function csrfMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Skip excluded routes
  if (isExcludedRoute(pathname)) {
    return null;
  }

  // Skip safe methods
  if (isSafeMethod(request.method)) {
    return null;
  }

  // Get CSRF token from cookie and header
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  // If no CSRF cookie exists, this is a new session - block request
  if (!cookieToken) {
    console.warn(`[CSRF] Missing CSRF cookie for ${request.method} ${pathname}`);
    return NextResponse.json(
      { error: "CSRF token missing. Please refresh the page and try again." },
      { status: 403 }
    );
  }

  // Verify token from header matches cookie
  if (!headerToken || headerToken !== cookieToken) {
    console.warn(`[CSRF] Invalid CSRF token for ${request.method} ${pathname}`);
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }

  // Verify Origin/Referer for same-site requests
  const origin = request.headers.get(ORIGIN_HEADER);
  const referer = request.headers.get(REFERER_HEADER);
  const host = request.headers.get("host");

  // If we have an Origin header, verify it matches our host
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        console.warn(`[CSRF] Origin mismatch: ${origin} vs ${host}`);
        return NextResponse.json(
          { error: "Origin verification failed" },
          { status: 403 }
        );
      }
    } catch {
      // Invalid origin URL
      console.warn(`[CSRF] Invalid origin URL: ${origin}`);
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403 }
      );
    }
  }

  // If we have a Referer, verify it's from our domain
  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== host) {
        console.warn(`[CSRF] Referer mismatch: ${referer} vs ${host}`);
        // Don't block, just warn - some privacy tools strip referer
      }
    } catch {
      // Invalid referer URL
      console.warn(`[CSRF] Invalid referer URL: ${referer}`);
    }
  }

  // CSRF verification passed
  return null;
}

/**
 * Generate a CSRF token
 * In production, use crypto.randomUUID() or a proper token library
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Cookie options for CSRF token
 */
export const CSRF_COOKIE_OPTIONS = {
  name: CSRF_TOKEN_COOKIE_NAME,
  httpOnly: false, // Must be readable by JavaScript
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
};
