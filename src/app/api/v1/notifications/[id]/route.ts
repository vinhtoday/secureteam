// PATCH /api/v1/notifications/[id] — Mark single notification as read
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

// PATCH /api/v1/notifications/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { id } = await context.params;

      const notification = await db.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return notFoundResponse('Thông báo không tồn tại');
      }

      // Only the recipient can mark their own notification as read
      if (notification.recipientId !== userId) {
        return notFoundResponse('Thông báo không tồn tại');
      }

      if (notification.isRead) {
        return successResponse(notification);
      }

      const updated = await db.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      });

      return successResponse(updated);
    } catch (error) {
      console.error('Mark notification read error:', error);
      return serverErrorResponse('Không thể cập nhật thông báo');
    }
  })(request, context);
}
