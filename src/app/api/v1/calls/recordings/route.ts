// GET /api/v1/calls/recordings
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

      // Only admin can view all recordings
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(userRole);
      if (rbacCheck) return rbacCheck;

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)),
        MAX_PAGE_SIZE
      );
      const status = searchParams.get('status');

      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (status) {
        where.status = status;
      }

      const [recordings, total] = await Promise.all([
        db.callRecording.findMany({
          where,
          include: {
            starter: {
              select: { id: true, name: true, avatar: true },
            },
            call: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                duration: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.callRecording.count({ where }),
      ]);

      return successResponse({
        recordings,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Recordings error:', error);
      return serverErrorResponse('Failed to fetch recordings');
    }
  })(request);
}
