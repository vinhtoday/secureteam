// POST /api/v1/auth/register
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, generateToken, signRefreshToken, hashToken } from '@/lib/auth';
import { successResponse, conflictResponse, validationResponse, serverErrorResponse } from '@/lib/api-response';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required').max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
      return validationResponse(errors);
    }

    const { email, password, name } = result.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return conflictResponse('Email already registered');
    }

    const memberRole = await db.role.findUnique({ where: { name: 'MEMBER' } });
    if (!memberRole) {
      return serverErrorResponse('Default role not found');
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: memberRole.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    });

    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.role.id,
      roleName: user.role.name,
    });
    const refreshToken = signRefreshToken(user.id);

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
    console.error('Register error:', error);
    return serverErrorResponse('Registration failed');
  }
}
