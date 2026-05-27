// GET/POST/DELETE /api/v1/tasks/[taskId]/assignments
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  notFoundResponse,
  conflictResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { createNotification } from '@/lib/notification-helper';

const assignSchema = z.object({
  userId: z.string().min(1, 'ID người dùng là bắt buộc'),
});

// GET /api/v1/tasks/[taskId]/assignments — List assignments
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const { id } = await context.params;
      const taskId = id;

      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const assignments = await db.taskAssignment.findMany({
        where: { taskId },
        select: {
          id: true,
          userId: true,
          assignedAt: true,
          user: {
            select: { id: true, name: true, avatar: true, department: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      return successResponse(assignments);
    } catch (error) {
      console.error('List task assignments error:', error);
      return serverErrorResponse('Không thể tải danh sách người thực hiện');
    }
  })(request, context);
}

// POST /api/v1/tasks/[taskId]/assignments — Assign user to task
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
      const result = assignSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { userId: targetUserId } = result.data;

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      // Verify user exists
      const targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true },
      });
      if (!targetUser) {
        return notFoundResponse('Người dùng không tồn tại');
      }

      // Check if already assigned
      const existing = await db.taskAssignment.findUnique({
        where: { taskId_userId: { taskId, userId: targetUserId } },
      });
      if (existing) {
        return conflictResponse('Người dùng đã được giao công việc này');
      }

      const assignment = await db.taskAssignment.create({
        data: {
          taskId,
          userId: targetUserId,
          assignedBy: userId,
        },
        select: {
          id: true,
          userId: true,
          assignedAt: true,
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
          action: 'assigned',
          newValue: JSON.stringify({ userId: targetUserId, userName: targetUser.name }),
        },
      });

      // Notify the assigned user
      if (targetUserId !== userId) {
        await createNotification({
          recipientId: targetUserId,
          senderId: userId,
          type: 'task_assigned',
          title: 'Bạn được giao một công việc',
          body: `"${task.title}" đã được giao cho bạn`,
          link: `/tasks/${taskId}`,
          metadata: { taskId },
        });
      }

      return successResponse(assignment, {}, 201);
    } catch (error) {
      console.error('Create task assignment error:', error);
      return serverErrorResponse('Không thể giao công việc');
    }
  })(request, context);
}

// DELETE /api/v1/tasks/[taskId]/assignments — Unassign user from task
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const { id } = await context.params;
      const taskId = id;
      const { searchParams } = new URL(request.url);
      const userIdToRemove = searchParams.get('userId');

      if (!userIdToRemove) {
        return validationResponse({
          userId: ['Tham số userId là bắt buộc để hủy giao việc'],
        });
      }

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      // Check assignment exists
      const assignment = await db.taskAssignment.findUnique({
        where: { taskId_userId: { taskId, userId: userIdToRemove } },
      });
      if (!assignment) {
        return notFoundResponse('Người dùng không được giao công việc này');
      }

      // Get user info before deletion
      const removedUser = await db.user.findUnique({
        where: { id: userIdToRemove },
        select: { name: true },
      });

      await db.taskAssignment.delete({
        where: { id: assignment.id },
      });

      // Create activity log
      await db.taskActivity.create({
        data: {
          taskId,
          userId,
          action: 'unassigned',
          newValue: JSON.stringify({
            userId: userIdToRemove,
            userName: removedUser?.name,
          }),
        },
      });

      return successResponse({ taskId, userId: userIdToRemove, removed: true });
    } catch (error) {
      console.error('Delete task assignment error:', error);
      return serverErrorResponse('Không thể hủy giao việc');
    }
  })(request, context);
}
