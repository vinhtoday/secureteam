// GET /api/v1/tasks + POST /api/v1/tasks
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { successResponse, paginatedResponse, validationResponse, serverErrorResponse, notFoundResponse } from '@/lib/api-response';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { createNotification } from '@/lib/notification-helper';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  channelId: z.string().optional(),
  parentId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

// GET /api/v1/tasks — List tasks with filters
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

      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const assigneeId = searchParams.get('assigneeId');
      const labelId = searchParams.get('labelId');
      const search = searchParams.get('search');
      const channelId = searchParams.get('channelId');
      const includeArchived = searchParams.get('includeArchived') === 'true';
      const myTasksOnly = searchParams.get('myTasks') === 'true';

      // Build where clause — user must be creator, assignee, or channel member
      const where: Record<string, unknown> = {
        isArchived: includeArchived ? undefined : false,
        OR: [
          { createdBy: userId },
          { assignments: { some: { userId } } },
        ],
      };

      // If channelId is specified, also check channel membership
      if (channelId) {
        const isMember = await db.channelMember.findUnique({
          where: { userId_channelId: { userId, channelId } },
        });
        if (isMember) {
          where.OR = [
            ...((where.OR as unknown[]) || []),
            { channelId },
          ];
        }
        where.channelId = channelId;
      }

      if (status) {
        where.status = status;
      }

      if (priority) {
        where.priority = priority;
      }

      if (assigneeId) {
        where.assignments = { some: { userId: assigneeId } };
      }

      if (labelId) {
        where.labels = { some: { labelId } };
      }

      if (search) {
        where.title = { contains: search };
      }

      if (myTasksOnly) {
        where.OR = [
          { createdBy: userId },
          { assignments: { some: { userId } } },
        ];
      }

      // Clean up undefined isArchived
      if (!includeArchived) {
        (where as Record<string, unknown>).isArchived = false;
      }

      const [tasks, total] = await Promise.all([
        db.task.findMany({
          where,
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
          orderBy: [
            { position: 'asc' },
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.task.count({ where }),
      ]);

      return paginatedResponse(tasks, page, limit, total);
    } catch (error) {
      console.error('List tasks error:', error);
      return serverErrorResponse('Không thể tải danh sách công việc');
    }
  })(request);
}

// POST /api/v1/tasks — Create task
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = createTaskSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const {
        title,
        description,
        status,
        priority,
        startDate,
        dueDate,
        channelId,
        parentId,
        assigneeIds,
        labelIds,
      } = result.data;

      // Validate channelId if provided
      if (channelId) {
        const channel = await db.channel.findUnique({ where: { id: channelId } });
        if (!channel) {
          return notFoundResponse('Kênh không tồn tại');
        }
      }

      // Validate parentId if provided
      if (parentId) {
        const parent = await db.task.findUnique({ where: { id: parentId } });
        if (!parent) {
          return notFoundResponse('Công việc cha không tồn tại');
        }
      }

      // Create task with assignments and labels
      const task = await db.task.create({
        data: {
          title,
          description,
          status,
          priority,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          channelId: channelId || null,
          parentId: parentId || null,
          createdBy: userId,
          assignments: assigneeIds && assigneeIds.length > 0
            ? {
                createMany: {
                  data: assigneeIds.map((uid) => ({
                    userId: uid,
                    assignedBy: userId,
                  })),
                },
              }
            : undefined,
          labels: labelIds && labelIds.length > 0
            ? {
                createMany: {
                  data: labelIds.map((lid) => ({
                    labelId: lid,
                  })),
                },
              }
            : undefined,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          progress: true,
          startDate: true,
          dueDate: true,
          channelId: true,
          parentId: true,
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
              label: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      });

      // Create activity log
      await db.taskActivity.create({
        data: {
          taskId: task.id,
          userId,
          action: 'created',
          newValue: JSON.stringify({ title, status, priority }),
        },
      });

      // Send notifications to assignees
      if (assigneeIds && assigneeIds.length > 0) {
        const notifyPromises = assigneeIds
          .filter((uid) => uid !== userId)
          .map((uid) =>
            createNotification({
              recipientId: uid,
              senderId: userId,
              type: 'task_assigned',
              title: 'Bạn được giao một công việc mới',
              body: `"${title}" đã được giao cho bạn`,
              link: `/tasks/${task.id}`,
              metadata: { taskId: task.id },
            })
          );
        await Promise.all(notifyPromises);
      }

      return successResponse(task, {}, 201);
    } catch (error) {
      console.error('Create task error:', error);
      return serverErrorResponse('Không thể tạo công việc');
    }
  })(request);
}
