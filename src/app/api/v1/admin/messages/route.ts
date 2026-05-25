// GET /api/v1/admin/messages - View messages (Admin)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { paginatedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      // Check ADMIN role
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      const adminUserId = getUserId(req);

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
      );
      const userId = searchParams.get('userId');
      const channelId = searchParams.get('channelId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const search = searchParams.get('search');

      // Build where clause
      const where: Record<string, unknown> = {};

      if (userId) {
        where.senderId = userId;
      }

      if (channelId) {
        where.channelId = channelId;
      }

      if (search) {
        where.content = { contains: search };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          (where.createdAt as Record<string, unknown>).lt = end;
        }
      }

      const [messages, total] = await Promise.all([
        db.message.findMany({
          where,
          select: {
            id: true,
            content: true,
            contentType: true,
            createdAt: true,
            fileUrl: true,
            fileName: true,
            channel: {
              select: { id: true, name: true, type: true },
            },
            sender: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.message.count({ where }),
      ]);

      // Create audit log entry
      await db.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'MESSAGES_VIEWED',
          target: channelId ?? 'all',
          details: JSON.stringify({
            userId,
            search,
            startDate,
            endDate,
            total,
          }),
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        },
      });

      return paginatedResponse(messages, page, limit, total);
    } catch (error) {
      console.error('Get admin messages error:', error);
      return serverErrorResponse('Failed to get messages');
    }
  })(request);
}
