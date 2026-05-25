// GET /api/v1/admin/audit-logs
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import { paginatedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      // Check ADMIN role
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
      );
      const userId = searchParams.get('userId');
      const action = searchParams.get('action');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Build where clause
      const where: Record<string, unknown> = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
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

      const [logs, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          select: {
            id: true,
            action: true,
            target: true,
            details: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.auditLog.count({ where }),
      ]);

      return paginatedResponse(logs, page, limit, total);
    } catch (error) {
      console.error('Get audit logs error:', error);
      return serverErrorResponse('Failed to get audit logs');
    }
  })(request);
}
