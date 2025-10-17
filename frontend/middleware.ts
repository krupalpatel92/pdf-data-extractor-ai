import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth endpoints
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Protected API routes - all PDF routes require authentication
  if (pathname.startsWith("/api/pdf")) {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/pdf/:path*"],
};
