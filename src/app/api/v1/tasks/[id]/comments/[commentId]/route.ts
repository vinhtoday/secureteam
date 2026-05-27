// PATCH/DELETE /api/v1/tasks/[taskId]/comments/[commentId]
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Nội dung bình luận là bắt buộc').max(5000),
  mentions: z.array(z.string()).optional(),
});

// PATCH /api/v1/tasks/[taskId]/comments/[commentId] — Update comment
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const { taskId, commentId } = await context.params;
      const body = await req.json();
      const result = updateCommentSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      // Check comment exists and belongs to the task
      const comment = await db.taskComment.findUnique({
        where: { id: commentId },
      });

      if (!comment || comment.taskId !== taskId) {
        return notFoundResponse('Bình luận không tồn tại');
      }

      // Only the author can edit their comment
      if (comment.userId !== userId) {
        return forbiddenResponse('Bạn chỉ có thể chỉnh sửa bình luận của mình');
      }

      const { content, mentions } = result.data;

      const updated = await db.taskComment.update({
        where: { id: commentId },
        data: {
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

      return successResponse(updated);
    } catch (error) {
      console.error('Update task comment error:', error);
      return serverErrorResponse('Không thể cập nhật bình luận');
    }
  })(request, context);
}

// DELETE /api/v1/tasks/[taskId]/comments/[commentId] — Delete comment
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const { taskId, commentId } = await context.params;

      // Check comment exists and belongs to the task
      const comment = await db.taskComment.findUnique({
        where: { id: commentId },
      });

      if (!comment || comment.taskId !== taskId) {
        return notFoundResponse('Bình luận không tồn tại');
      }

      // Only the author can delete their comment
      if (comment.userId !== userId) {
        return forbiddenResponse('Bạn chỉ có thể xóa bình luận của mình');
      }

      await db.taskComment.delete({ where: { id: commentId } });

      return successResponse({ id: commentId, deleted: true });
    } catch (error) {
      console.error('Delete task comment error:', error);
      return serverErrorResponse('Không thể xóa bình luận');
    }
  })(request, context);
}
