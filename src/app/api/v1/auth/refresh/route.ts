// POST /api/v1/auth/refresh
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyRefreshToken, generateToken } from '@/lib/auth';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return unauthorizedResponse('No refresh token provided');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = unauthorizedResponse('Invalid refresh token');
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    // Find session
    const session = await db.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            role: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!session || session.userId !== payload.userId) {
      const response = unauthorizedResponse('Session not found');
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    if (!session.user.isActive) {
      return unauthorizedResponse('User account is inactive');
    }

    if (session.expiresAt < new Date()) {
      // Session expired, delete it
      await db.session.delete({ where: { id: session.id } });
      const response = unauthorizedResponse('Session expired');
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    // Generate new access token
    const accessToken = generateToken({
      userId: session.user.id,
      email: session.user.email,
      roleId: session.user.role.id,
      roleName: session.user.role.name,
    });

    // Update session activity
    await db.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return successResponse({ accessToken }, {});
  } catch (error) {
    console.error('Refresh token error:', error);
    return serverErrorResponse('Token refresh failed');
  }
}
