// SecureTeam - API Response Helpers
import { NextResponse } from 'next/server';

interface MetaData {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, meta?: MetaData, status = 200) {
  return NextResponse.json(
    { data, ...(meta ? { meta } : {}) },
    { status }
  );
}

/**
 * Create a paginated success response
 */
export function paginatedResponse<T>(
  data: T,
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  status = 400
) {
  return NextResponse.json(
    { error: code, message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse('UNAUTHORIZED', message, undefined, 401);
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(message = 'Insufficient permissions') {
  return errorResponse('FORBIDDEN', message, undefined, 403);
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(message = 'Resource not found') {
  return errorResponse('NOT_FOUND', message, undefined, 404);
}

/**
 * Create a conflict response (409)
 */
export function conflictResponse(message: string) {
  return errorResponse('CONFLICT', message, undefined, 409);
}

/**
 * Create a validation error response (422)
 */
export function validationResponse(errors: Record<string, string[]>) {
  return errorResponse('VALIDATION_ERROR', 'Validation failed', { errors }, 422);
}

/**
 * Create a server error response (500)
 */
export function serverErrorResponse(message = 'Internal server error') {
  return errorResponse('SERVER_ERROR', message, undefined, 500);
}

/**
 * Create a no-data success response
 */
export function nullResponse(status = 200) {
  return NextResponse.json({ data: null }, { status });
}
