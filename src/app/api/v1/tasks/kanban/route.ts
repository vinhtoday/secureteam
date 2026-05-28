// GET /api/v1/tasks/kanban
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { searchParams } = new URL(request.url);

      const priority = searchParams.get('priority');
      const assigneeId = searchParams.get('assigneeId');
      const labelId = searchParams.get('labelId');
      const search = searchParams.get('search');
      const channelId = searchParams.get('channelId');
      const includeArchived = searchParams.get('includeArchived') === 'true';

      const where: Record<string, any> = {
        isArchived: includeArchived ? undefined : false,
        OR: [
          { createdBy: userId },
          { assignments: { some: { userId } } },
        ],
      };

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

      if (!includeArchived) {
        where.isArchived = false;
      }

      const tasks = await db.task.findMany({
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
      });

      // Map DB structure to front-end labels format
      const formattedTasks = tasks.map((task) => ({
        ...task,
        labels: task.labels.map((l: any) => l.label),
      }));

      // Group tasks into Kanban columns
      const statuses = ['todo', 'in_progress', 'review', 'done'];
      const columns = statuses.map((status) => ({
        status,
        tasks: formattedTasks.filter((t) => t.status === status),
      }));

      return successResponse(columns);
    } catch (error) {
      console.error('List kanban tasks error:', error);
      return serverErrorResponse('Không thể tải bảng công việc');
    }
  })(request);
}
