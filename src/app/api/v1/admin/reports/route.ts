// GET /api/v1/admin/reports — User activity reports
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const user = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
      const roleName = user?.role?.name;

      if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
        return forbiddenResponse('Không có quyền truy cập');
      }

      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || 'all'; // "week", "month", "all"

      let dateFilter: Date | undefined;
      if (period === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const users = await db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          department: true,
          position: true,
          role: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });

      const userReports = await Promise.all(
        users.map(async (u) => {
          const messageCount = await db.message.count({
            where: {
              senderId: u.id,
              ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
            },
          });

          const taskCreated = await db.task.count({
            where: {
              createdBy: u.id,
              isArchived: false,
              ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
            },
          });

          const taskCompleted = await db.task.count({
            where: {
              assignments: { some: { userId: u.id } },
              status: 'done',
              ...(dateFilter ? { completedAt: { gte: dateFilter } } : {}),
            },
          });

          const taskInProgress = await db.task.count({
            where: {
              assignments: { some: { userId: u.id } },
              status: 'in_progress',
              isArchived: false,
            },
          });

          const taskComments = await db.taskComment.count({
            where: {
              userId: u.id,
              ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
            },
          });

          const callParticipations = await db.callParticipant.count({
            where: {
              userId: u.id,
              status: 'joined',
              ...(dateFilter ? { joinedAt: { gte: dateFilter } } : {}),
            },
          });

          return {
            user: u,
            stats: {
              messagesSent: messageCount,
              tasksCreated: taskCreated,
              tasksCompleted: taskCompleted,
              tasksInProgress: taskInProgress,
              taskComments,
              callParticipations,
            },
          };
        })
      );

      // Summary stats
      const summary = {
        totalMessages: userReports.reduce((s, r) => s + r.stats.messagesSent, 0),
        totalTasks: await db.task.count({ where: { isArchived: false } }),
        totalCompleted: await db.task.count({ where: { status: 'done', isArchived: false } }),
        totalUsers: users.length,
        onlineUsers: await db.user.count({ where: { onlineStatus: 'online' } }),
      };

      return successResponse({ users: userReports, summary });
    } catch (error) {
      console.error('Admin reports error:', error);
      return serverErrorResponse('Không thể tải báo cáo');
    }
  })(request);
}
