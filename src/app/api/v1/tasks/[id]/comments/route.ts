// GET /api/v1/tasks/[taskId]/comments + POST /api/v1/tasks/[taskId]/comments
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  paginatedResponse,
  notFoundResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { createNotification } from '@/lib/notification-helper';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Nội dung bình luận là bắt buộc').max(5000),
  mentions: z.array(z.string()).optional(),
});

// GET /api/v1/tasks/[taskId]/comments — List comments
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

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const [comments, total] = await Promise.all([
        db.taskComment.findMany({
          where: { taskId },
          select: {
            id: true,
            content: true,
            mentions: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.taskComment.count({ where: { taskId } }),
      ]);

      return paginatedResponse(comments, page, limit, total);
    } catch (error) {
      console.error('List task comments error:', error);
      return serverErrorResponse('Không thể tải bình luận');
    }
  })(request, context);
}

// POST /api/v1/tasks/[taskId]/comments — Create comment
export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const { id } = await context.params;
      const taskId = id;
      const body = await req.json();
      const result = createCommentSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const { content, mentions } = result.data;

      const comment = await db.taskComment.create({
        data: {
          taskId,
          userId,
          content,
          mentions: mentions && mentions.length > 0 ? JSON.stringify(mentions) : null,
        },
        select: {
          id: true,
          content: true,
          mentions: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Create activity log
      await db.taskActivity.create({
        data: {
          taskId,
          userId,
          action: 'commented',
          metadata: JSON.stringify({ commentId: comment.id, preview: content.substring(0, 100) }),
        },
      });

      // Notify task creator and assignees
      const [creator, assignments] = await Promise.all([
        db.user.findUnique({
          where: { id: task.createdBy },
          select: { id: true },
        }),
        db.taskAssignment.findMany({
          where: { taskId },
          select: { userId: true },
        }),
      ]);

      const recipientIds = new Set<string>();
      if (creator && creator.id !== userId) recipientIds.add(creator.id);
      for (const a of assignments) {
        if (a.userId !== userId) recipientIds.add(a.userId);
      }

      // Also add mentioned users
      if (mentions) {
        for (const mId of mentions) {
          if (mId !== userId) recipientIds.add(mId);
        }
      }

      const notifyPromises = Array.from(recipientIds).map((recipientId) =>
        createNotification({
          recipientId,
          senderId: userId,
          type: 'task_commented',
          title: 'Bình luận mới trong công việc',
          body: `"${task.title}" - ${content.substring(0, 100)}`,
          link: `/tasks/${taskId}`,
          metadata: { taskId, commentId: comment.id },
        })
      );
      await Promise.all(notifyPromises);

      return successResponse(comment, {}, 201);
    } catch (error) {
      console.error('Create task comment error:', error);
      return serverErrorResponse('Không thể tạo bình luận');
    }
  })(request, context);
}
