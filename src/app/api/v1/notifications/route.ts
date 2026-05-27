// GET /api/v1/notifications + POST /api/v1/notifications
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

// GET /api/v1/notifications — List user notifications with unread count
export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
      );
      const type = searchParams.get('type');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      // Build where clause
      const where: Record<string, unknown> = { recipientId: userId };

      if (type) {
        where.type = type;
      }

      if (unreadOnly) {
        where.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            link: true,
            isRead: true,
            readAt: true,
            createdAt: true,
            sender: {
              select: { id: true, name: true, avatar: true },
            },
            metadata: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.notification.count({ where }),
        db.notification.count({
          where: { recipientId: userId, isRead: false },
        }),
      ]);

      return NextResponse.json({
        data: notifications,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          unreadCount,
        },
      });
    } catch (error) {
      console.error('List notifications error:', error);
      return serverErrorResponse('Không thể tải thông báo');
    }
  })(request);
}

// POST /api/v1/notifications — Mark as read / mark all read
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = markReadSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { notificationIds, markAll } = result.data;

      if (markAll) {
        // Mark all as read
        await db.notification.updateMany({
          where: { recipientId: userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });

        return successResponse({ markedAllAsRead: true });
      }

      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        await db.notification.updateMany({
          where: {
            id: { in: notificationIds },
            recipientId: userId,
          },
          data: { isRead: true, readAt: new Date() },
        });

        return successResponse({ markedCount: notificationIds.length });
      }

      return validationResponse({
        notificationIds: ['Vui lòng cung cấp notificationIds hoặc markAll'],
      });
    } catch (error) {
      console.error('Mark notifications read error:', error);
      return serverErrorResponse('Không thể cập nhật thông báo');
    }
  })(request);
}
