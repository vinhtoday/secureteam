// GET /api/v1/admin/calls
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserRole } from '@/lib/auth-middleware';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { successResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userRole = getUserRole(req);

      // Only admin can access
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(userRole);
      if (rbacCheck) return rbacCheck;

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)),
        MAX_PAGE_SIZE
      );
      const userId = searchParams.get('userId');
      const status = searchParams.get('status');
      const type = searchParams.get('type');

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (userId) {
        where.participants = {
          some: { userId },
        };
      }

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      const [calls, total] = await Promise.all([
        db.callRoom.findMany({
          where,
          include: {
            creator: {
              select: { id: true, name: true, avatar: true, email: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true, email: true },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
            recordings: {
              select: {
                id: true,
                type: true,
                status: true,
                duration: true,
                createdAt: true,
                startedBy: true,
              },
            },
            channel: {
              select: { id: true, name: true, type: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.callRoom.count({ where }),
      ]);

      // Calculate stats
      const activeCallCount = await db.callRoom.count({ where: { status: 'active' } });
      const totalCallCount = await db.callRoom.count();
      const todayCallCount = await db.callRoom.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      const totalRecordingCount = await db.callRecording.count();

      return successResponse({
        calls: calls.map((call) => ({
          ...call,
          participantCount: call.participants.length,
          recordingCount: call.recordings.length,
        })),
        stats: {
          activeCallCount,
          totalCallCount,
          todayCallCount,
          totalRecordingCount,
        },
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Admin calls error:', error);
      return serverErrorResponse('Failed to fetch admin call data');
    }
  })(request);
}
