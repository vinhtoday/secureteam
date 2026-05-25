// GET /api/v1/admin/dashboard
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES } from '@/lib/constants';
import { successResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      // Check ADMIN role
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Run all queries in parallel
      const [
        totalUsers,
        onlineUsers,
        messagesToday,
        activeChannels,
        recentUsers,
        messagesByDay,
      ] = await Promise.all([
        // Total users
        db.user.count({ where: { isActive: true } }),

        // Online users
        db.user.count({
          where: {
            isActive: true,
            onlineStatus: { in: ['online', 'away', 'busy'] },
          },
        }),

        // Messages today
        db.message.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
          },
        }),

        // Active channels (channels with messages in last 7 days)
        db.channel.count({
          where: {
            messages: {
              some: {
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            },
          },
        }),

        // Recent users (last 7 days)
        db.user.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          select: { id: true, name: true, email: true, avatar: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),

        // Messages per day (last 7 days)
        Promise.all(
          Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            return db.message
              .count({
                where: { createdAt: { gte: date, lt: nextDate } },
              })
              .then((count) => ({
                date: date.toISOString().split('T')[0],
                count,
              }));
          })
        ),
      ]);

      return successResponse({
        totalUsers,
        onlineUsers,
        messagesToday,
        activeChannels,
        recentUsers,
        messagesByDay,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      return serverErrorResponse('Failed to load dashboard');
    }
  })(request);
}
