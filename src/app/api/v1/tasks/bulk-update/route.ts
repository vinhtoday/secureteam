// POST /api/v1/tasks/bulk-update — Bulk update tasks (e.g. Kanban drag-drop)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { successResponse, validationResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-response';
import { createNotification } from '@/lib/notification-helper';

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một công việc'),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  // For drag-drop: update positions
  updates: z.array(
    z.object({
      id: z.string(),
      status: z.string().optional(),
      position: z.number().optional(),
    })
  ).optional(),
});

// POST /api/v1/tasks/bulk-update
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = bulkUpdateSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { taskIds, status, priority, updates, assigneeIds, labelIds } = result.data;

      // Handle drag-drop updates (with position)
      if (updates && updates.length > 0) {
        const updatePromises = updates.map(async (update) => {
          const existing = await db.task.findUnique({ where: { id: update.id } });
          if (!existing) return null;

          const data: Record<string, unknown> = {};
          if (update.status) data.status = update.status;
          if (update.position !== undefined) data.position = update.position;

          // Auto-set completedAt
          if (update.status === 'done' && existing.status !== 'done') {
            data.completedAt = new Date();
          } else if (update.status && update.status !== 'done') {
            data.completedAt = null;
          }

          const [updated] = await Promise.all([
            db.task.update({
              where: { id: update.id },
              data,
              select: {
                id: true,
                title: true,
                status: true,
                position: true,
              },
            }),
            // Create activity log
            ...(update.status && update.status !== existing.status
              ? [
                  db.taskActivity.create({
                    data: {
                      taskId: update.id,
                      userId,
                      action: 'status_changed',
                      oldValue: existing.status,
                      newValue: update.status,
                    },
                  }),
                ]
              : []),
            ...(update.position !== undefined && update.position !== existing.position
              ? [
                  db.taskActivity.create({
                    data: {
                      taskId: update.id,
                      userId,
                      action: 'reordered',
                      oldValue: String(existing.position),
                      newValue: String(update.position),
                    },
                  }),
                ]
              : []),
          ]);

          return updated;
        });

        const results = await Promise.all(updatePromises);
        return successResponse(results.filter(Boolean));
      }

      // Handle bulk status/priority update
      const data: Record<string, unknown> = {};
      if (status) {
        data.status = status;
        if (status === 'done') {
          data.completedAt = new Date();
        } else {
          data.completedAt = null;
        }
      }
      if (priority) data.priority = priority;

      // Verify all tasks exist
      const existingTasks = await db.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, title: true, status: true },
      });

      if (existingTasks.length !== taskIds.length) {
        const foundIds = new Set(existingTasks.map((t) => t.id));
        const missing = taskIds.filter((id) => !foundIds.has(id));
        return notFoundResponse(`Một số công việc không tồn tại: ${missing.join(', ')}`);
      }

      const updatedTasks = await db.task.updateMany({
        where: { id: { in: taskIds } },
        data,
      });

      // Create activity logs for each task
      const activityPromises = existingTasks.map((task) => {
        const changes: string[] = [];
        if (status && status !== task.status) {
          changes.push(`trạng thái → ${status}`);
        }
        if (priority) changes.push(`mức ưu tiên → ${priority}`);

        if (changes.length === 0) return Promise.resolve();

        return db.taskActivity.create({
          data: {
            taskId: task.id,
            userId,
            action: 'bulk_updated',
            oldValue: task.status,
            newValue: JSON.stringify(data),
            metadata: JSON.stringify({ changes }),
          },
        });
      });
      await Promise.all(activityPromises);

      // Notify assignees
      if (status) {
        const assignments = await db.taskAssignment.findMany({
          where: { taskId: { in: taskIds } },
          select: { userId: true, taskId: true },
          distinct: ['userId'],
        });

        const notifyPromises = assignments
          .filter((a) => a.userId !== userId)
          .map((a) => {
            const task = existingTasks.find((t) => t.id === a.taskId);
            return createNotification({
              recipientId: a.userId,
              senderId: userId,
              type: 'task_updated',
              title: 'Công việc đã được cập nhật hàng loạt',
              body: `"${task?.title}" - trạng thái đã thay đổi thành ${status}`,
              link: `/tasks/${a.taskId}`,
              metadata: { taskId: a.taskId },
            });
          });
        await Promise.all(notifyPromises);
      }

      return successResponse({ updatedCount: updatedTasks.count });
    } catch (error) {
      console.error('Bulk update tasks error:', error);
      return serverErrorResponse('Không thể cập nhật hàng loạt');
    }
  })(request);
}
