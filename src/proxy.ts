import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy for authentication route protection.
 * If a user already possesses a valid "token" cookie and attempts to visit
 * the landing page ("/") or auth pages ("/login", "/register"),
 * redirect them immediately to the authenticated "/workspace".
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (token && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
