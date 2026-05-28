// GET/PATCH/DELETE /api/v1/tasks/[id]
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { successResponse, validationResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-response';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  isArchived: z.boolean().optional(),
  position: z.number().optional(),
});

// GET /api/v1/tasks/[id] — Fetch single task with relations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req) => {
    try {
      const { id } = params;
      const task = await db.task.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          progress: true,
          startDate: true,
          dueDate: true,
          completedAt: true,
          channelId: true,
          parentId: true,
          position: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          assignments: {
            select: {
              id: true,
              userId: true,
              assignedAt: true,
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          labels: {
            select: {
              id: true,
              labelId: true,
              label: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              children: true,
            },
          },
        },
      });

      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      // Map labels relationship to flat array of label objects
      const formattedTask = {
        ...task,
        labels: task.labels.map((l: any) => l.label),
      };

      return successResponse(formattedTask);
    } catch (error) {
      console.error('Get task error:', error);
      return serverErrorResponse('Không thể tải thông tin công việc');
    }
  })(request);
}

// PATCH /api/v1/tasks/[id] — Update task fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = params;
      const userId = getUserId(req);
      const body = await req.json();

      const result = updateTaskSchema.safeParse(body);
      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const existingTask = await db.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const data: Record<string, any> = { ...result.data };

      // Parse dates if provided
      if (body.startDate !== undefined) {
        data.startDate = body.startDate ? new Date(body.startDate) : null;
      }
      if (body.dueDate !== undefined) {
        data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      }

      // Set completedAt automatically if status changes to done
      if (data.status === 'done' && existingTask.status !== 'done') {
        data.completedAt = new Date();
      } else if (data.status && data.status !== 'done') {
        data.completedAt = null;
      }

      const updatedTask = await db.task.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          progress: true,
          startDate: true,
          dueDate: true,
          completedAt: true,
          channelId: true,
          parentId: true,
          position: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          assignments: {
            select: {
              id: true,
              userId: true,
              assignedAt: true,
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          labels: {
            select: {
              id: true,
              labelId: true,
              label: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              children: true,
            },
          },
        },
      });

      // Track activity logs for major changes
      const activityPromises: Promise<any>[] = [];

      if (data.status && data.status !== existingTask.status) {
        activityPromises.push(
          db.taskActivity.create({
            data: {
              taskId: id,
              userId,
              action: 'status_changed',
              oldValue: existingTask.status,
              newValue: data.status,
            },
          })
        );
      }

      if (data.priority && data.priority !== existingTask.priority) {
        activityPromises.push(
          db.taskActivity.create({
            data: {
              taskId: id,
              userId,
              action: 'priority_changed',
              oldValue: existingTask.priority,
              newValue: data.priority,
            },
          })
        );
      }

      if (data.progress !== undefined && data.progress !== existingTask.progress) {
        activityPromises.push(
          db.taskActivity.create({
            data: {
              taskId: id,
              userId,
              action: 'progress_updated',
              newValue: String(data.progress),
            },
          })
        );
      }

      if (data.title && data.title !== existingTask.title) {
        activityPromises.push(
          db.taskActivity.create({
            data: {
              taskId: id,
              userId,
              action: 'title_changed',
              oldValue: existingTask.title,
              newValue: data.title,
            },
          })
        );
      }

      if (body.dueDate !== undefined) {
        const oldVal = existingTask.dueDate ? existingTask.dueDate.toISOString() : '';
        const newVal = data.dueDate ? data.dueDate.toISOString() : '';
        if (oldVal !== newVal) {
          activityPromises.push(
            db.taskActivity.create({
              data: {
                taskId: id,
                userId,
                action: 'due_date_changed',
                oldValue: oldVal,
                newValue: newVal,
              },
            })
          );
        }
      }

      if (activityPromises.length > 0) {
        await Promise.all(activityPromises);
      }

      // Map labels relationship to flat array of label objects
      const formattedTask = {
        ...updatedTask,
        labels: updatedTask.labels.map((l: any) => l.label),
      };

      return successResponse(formattedTask);
    } catch (error) {
      console.error('Update task error:', error);
      return serverErrorResponse('Không thể cập nhật công việc');
    }
  })(request);
}

// DELETE /api/v1/tasks/[id] — Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = params;

      const existingTask = await db.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        return notFoundResponse('Công việc không tồn tại');
      }

      await db.task.delete({
        where: { id },
      });

      return successResponse({ deleted: true });
    } catch (error) {
      console.error('Delete task error:', error);
      return serverErrorResponse('Không thể xóa công việc');
    }
  })(request);
}
