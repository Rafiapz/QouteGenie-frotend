import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for authentication route protection.
 * If a user already possesses a valid "token" cookie and attempts to visit
 * the landing page ("/") or auth pages ("/login", "/register"),
 * redirect them immediately to the authenticated "/dashboard".
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (token && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
