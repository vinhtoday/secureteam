// POST /api/v1/auth/login
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { comparePassword, generateToken, signRefreshToken, hashToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { ERROR_CODES } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
      return validationResponse(errors);
    }

    const { email, password } = result.data;

    // Find user with role
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        isLocked: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return errorResponse(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS.code,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS.message,
        undefined,
        401
      );
    }

    if (!user.isActive) {
      return errorResponse(
        ERROR_CODES.AUTH_USER_INACTIVE.code,
        ERROR_CODES.AUTH_USER_INACTIVE.message,
        undefined,
        403
      );
    }

    if (user.isLocked) {
      return errorResponse(
        ERROR_CODES.AUTH_USER_LOCKED.code,
        ERROR_CODES.AUTH_USER_LOCKED.message,
        undefined,
        403
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return errorResponse(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS.code,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS.message,
        undefined,
        401
      );
    }

    // Generate tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.role.id,
      roleName: user.role.name,
    });
    const refreshToken = signRefreshToken(user.id);

    // Create session
    const tokenHash = await hashToken(accessToken);
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: request.headers.get('user-agent') ?? undefined,
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      },
    });

    // Update last seen
    await db.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    });

    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
        },
        accessToken,
      },
      {}
    );

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Login failed');
  }
}
