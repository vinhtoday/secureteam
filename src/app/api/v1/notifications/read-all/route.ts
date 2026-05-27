// POST /api/v1/notifications/read-all — Mark all notifications as read
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const result = await db.notification.updateMany({
        where: { recipientId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      return successResponse({ markedCount: result.count });
    } catch (error) {
      console.error('Mark all read error:', error);
      return serverErrorResponse('Không thể cập nhật thông báo');
    }
  })(request);
}
