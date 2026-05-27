// PATCH /api/v1/notifications/[id]/read — Mark single notification as read
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

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

      if (!notification || notification.recipientId !== userId) {
        return notFoundResponse('Thông báo không tồn tại');
      }

      const updated = await db.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
        select: { id: true, isRead: true, readAt: true },
      });

      return successResponse(updated);
    } catch (error) {
      console.error('Mark notification read error:', error);
      return serverErrorResponse('Không thể cập nhật thông báo');
    }
  })(request, context);
}
