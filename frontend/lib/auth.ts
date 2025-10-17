import { NextRequest, NextResponse } from "next/server";

// Static password
export const STATIC_PASSWORD = "oishdfoiewu02384!!";

// Session cookie name
export const SESSION_COOKIE_NAME = "pdf_extractor_session";

// Session duration: 7 days in seconds
export const SESSION_DURATION = 7 * 24 * 60 * 60;

// Simple hash function for session token
export function generateSessionToken(password: string): string {
  const timestamp = Date.now();
  return Buffer.from(`${password}-${timestamp}`).toString("base64");
}

// Verify if the password is correct
export function verifyPassword(password: string): boolean {
  return password === STATIC_PASSWORD;
}

// Check if session is valid from request
export function isAuthenticated(request: NextRequest): boolean {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return false;
  }

  // Verify the session token contains the correct password
  try {
    const decoded = Buffer.from(sessionToken, "base64").toString("utf-8");
    return decoded.startsWith(STATIC_PASSWORD);
  } catch {
    return false;
  }
}

// Create response with session cookie
export function createSessionResponse(response: NextResponse): NextResponse {
  const sessionToken = generateSessionToken(STATIC_PASSWORD);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return response;
}

// Clear session cookie
export function clearSession(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
