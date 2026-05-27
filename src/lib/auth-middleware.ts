// SecureTeam - Authentication Middleware
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type JwtPayload } from './auth';
import { unauthorizedResponse } from './api-response';

export interface AuthenticatedRequest extends NextRequest {
  user: JwtPayload;
}

/**
 * Extract JWT from Authorization header and verify it
 * Returns the payload or null if invalid
 */
export function extractAuthUser(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

/**
 * Get user ID from request (after withAuth has been applied)
 */
export function getUserId(request: AuthenticatedRequest): string {
  return request.user.userId;
}

/**
 * Get user role from request (after withAuth has been applied)
 */
export function getUserRole(request: AuthenticatedRequest): string {
  return request.user.roleName;
}

type AuthenticatedHandler = (
  request: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps a route handler with authentication
 * Verifies JWT token and attaches user to request
 */
export function withAuth(handler: AuthenticatedHandler): (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const payload = extractAuthUser(request);
    if (!payload) {
      return unauthorizedResponse('Invalid or missing authentication token');
    }

    // Attach user info to request by creating an AuthenticatedRequest-like object
    const authRequest = Object.assign(request, { user: payload }) as AuthenticatedRequest;

    return handler(authRequest, context);
  };
}
