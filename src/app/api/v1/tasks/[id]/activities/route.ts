// GET /api/v1/tasks/[taskId]/activities — List task activity log
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import {
  successResponse,
  paginatedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// GET /api/v1/tasks/[taskId]/activities
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const { id } = await context.params;
      const taskId = id;
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
      );
      const action = searchParams.get('action');

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const where: Record<string, unknown> = { taskId };
      if (action) {
        where.action = action;
      }

      const [activities, total] = await Promise.all([
        db.taskActivity.findMany({
          where,
          select: {
            id: true,
            action: true,
            oldValue: true,
            newValue: true,
            metadata: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.taskActivity.count({ where }),
      ]);

      return paginatedResponse(activities, page, limit, total);
    } catch (error) {
      console.error('List task activities error:', error);
      return serverErrorResponse('Không thể tải lịch sử hoạt động');
    }
  })(request, context);
}
