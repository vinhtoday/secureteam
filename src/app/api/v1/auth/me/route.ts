// GET /api/v1/auth/me
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          isEmailVerified: true,
          isActive: true,
          isLocked: true,
          twoFactorEnabled: true,
          lastSeen: true,
          onlineStatus: true,
          createdAt: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        return serverErrorResponse('User not found');
      }

      // Parse permissions
      let permissions = {};
      try {
        permissions = JSON.parse(user.role.permissions);
      } catch {
        // Use empty permissions if parsing fails
      }

      return successResponse({
        ...user,
        role: {
          ...user.role,
          permissions,
        },
      });
    } catch (error) {
      console.error('Get me error:', error);
      return serverErrorResponse('Failed to get user info');
    }
  })(request);
}
