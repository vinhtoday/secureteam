// GET /api/v1/users/online - Get online users
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (_req) => {
    try {
      const onlineUsers = await db.user.findMany({
        where: {
          isActive: true,
          onlineStatus: { in: ['online', 'away', 'busy'] },
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          onlineStatus: true,
          lastSeen: true,
          role: {
            select: { name: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return successResponse(onlineUsers);
    } catch (error) {
      console.error('Get online users error:', error);
      return serverErrorResponse('Failed to get online users');
    }
  })(request);
}
