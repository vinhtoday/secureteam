// POST /api/v1/auth/logout
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { nullResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);

      // Delete all sessions for the user
      await db.session.deleteMany({
        where: { userId },
      });

      const response = nullResponse();
      response.cookies.set('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      return serverErrorResponse('Logout failed');
    }
  })(request);
}
