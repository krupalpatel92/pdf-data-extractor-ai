# Password Protection Implementation

## Overview

This document describes the password protection implementation for the PDF Data Extractor application.

## Features Implemented

### 1. Static Password Protection

- **Password**: `oishdfoiewu02384!!` (hardcoded in the application)
- **Session Duration**: 7 days
- Users must enter the correct password to access the application
- Session is stored in an HTTP-only cookie for security

### 2. Authentication Flow

#### Login Process

1. User lands on the login page
2. Enters the password in a single input field
3. Upon successful authentication:
   - A session cookie is created with 7-day expiry
   - User is redirected to the main application

#### Session Management

- Session token is stored in an HTTP-only cookie (`pdf_extractor_session`)
- Cookie is secure in production (HTTPS only)
- Cookie expires after 7 days
- After expiry, user must re-enter the password

### 3. Protected Routes

#### API Routes (Backend Protection)

All PDF-related API routes are protected by middleware:

- `/api/pdf/extract` - Upload and extract data from PDFs
- `/api/pdf/all` - Get all extracted data
- `/api/pdf/[id]` - Get specific extracted data

Unprotected routes:

- `/api/auth/login` - Login endpoint
- `/api/auth/logout` - Logout endpoint
- `/api/auth/check` - Check authentication status

#### Frontend Protection

- Main application page shows login form if not authenticated
- PDF upload functionality is only accessible after login
- Logout button available in the header after authentication

### 4. Files Created/Modified

#### New Files

1. **`/frontend/lib/auth.ts`**

   - Authentication utility functions
   - Password verification
   - Session token generation and validation
   - Cookie management

2. **`/frontend/app/api/auth/login/route.ts`**

   - Login API endpoint
   - Validates password and creates session

3. **`/frontend/app/api/auth/logout/route.ts`**

   - Logout API endpoint
   - Clears session cookie

4. **`/frontend/app/api/auth/check/route.ts`**

   - Auth status check endpoint
   - Returns authentication state

5. **`/frontend/components/login-form.tsx`**

   - Login page UI component
   - Password input field
   - Form submission handling

6. **`/frontend/components/auth-provider.tsx`**

   - React context provider for authentication state
   - Manages auth state across the application

7. **`/frontend/middleware.ts`**
   - Next.js middleware for route protection
   - Intercepts requests to protected API routes
   - Returns 401 if not authenticated

#### Modified Files

1. **`/frontend/app/layout.tsx`**

   - Added AuthProvider wrapper
   - Provides auth context to all pages

2. **`/frontend/app/page.tsx`**

   - Converted to client component
   - Shows login form or main app based on auth state
   - Added logout button

3. **`/frontend/components/pdf-upload.tsx`**
   - Added 401 error handling
   - Better error messages for unauthorized requests

## Security Features

1. **HTTP-Only Cookies**: Session tokens stored in HTTP-only cookies prevent XSS attacks
2. **Secure Flag**: In production, cookies are only sent over HTTPS
3. **SameSite Protection**: Prevents CSRF attacks
4. **Server-Side Validation**: All routes protected at the middleware level
5. **Client-Side Guards**: UI prevents unauthorized access

## Usage

### For Users

1. Navigate to the application URL
2. Enter password: `oishdfoiewu02384!!`
3. Click "Login"
4. Use the application normally
5. Session persists for 7 days
6. Click "Logout" to end session early

### For Developers

- Password is stored in `/frontend/lib/auth.ts` as `STATIC_PASSWORD`
- To change session duration, modify `SESSION_DURATION` in the same file
- To add more protected routes, update the middleware matcher

## Testing Checklist

✅ User cannot access main page without authentication
✅ User cannot call PDF APIs without authentication
✅ Login with correct password works
✅ Login with incorrect password fails
✅ Session persists across page refreshes
✅ Session expires after 7 days
✅ Logout clears session
✅ Protected API routes return 401 when not authenticated

## Environment Variables

No additional environment variables required. Everything is configured in the code.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Cookie support required
- JavaScript enabled required
