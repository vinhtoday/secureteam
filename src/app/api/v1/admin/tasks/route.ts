// GET /api/v1/admin/tasks — List all tasks (admin view)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { paginatedResponse, serverErrorResponse, forbiddenResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const user = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
      const roleName = user?.role?.name;

      if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN' && roleName !== 'LEADER') {
        return forbiddenResponse('Không có quyền truy cập');
      }

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const assigneeId = searchParams.get('assigneeId');
      const search = searchParams.get('search');

      const where: Record<string, unknown> = { isArchived: false };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assignments = { some: { userId: assigneeId } };
      if (search) where.title = { contains: search };

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
            dueDate: true,
            createdAt: true,
            updatedAt: true,
            creator: { select: { id: true, name: true, avatar: true } },
            assignments: {
              select: {
                id: true,
                userId: true,
                user: { select: { id: true, name: true, avatar: true, department: true } },
              },
            },
            labels: {
              select: {
                id: true,
                label: { select: { id: true, name: true, color: true } },
              },
            },
            _count: { select: { comments: true, attachments: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.task.count({ where }),
      ]);

      return paginatedResponse(tasks, page, limit, total);
    } catch (error) {
      console.error('Admin tasks error:', error);
      return serverErrorResponse('Không thể tải danh sách công việc');
    }
  })(request);
}
