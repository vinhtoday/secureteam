// GET /api/v1/users - List users (Admin only)
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
      const search = searchParams.get('search');
      const roleFilter = searchParams.get('role');
      const status = searchParams.get('status');

      // Build where clause
      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }

      if (roleFilter) {
        where.role = { name: roleFilter };
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      } else if (status === 'locked') {
        where.isLocked = true;
      }

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            bio: true,
            isActive: true,
            isLocked: true,
            isEmailVerified: true,
            twoFactorEnabled: true,
            lastSeen: true,
            onlineStatus: true,
            createdAt: true,
            role: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.user.count({ where }),
      ]);

      return paginatedResponse(users, page, limit, total);
    } catch (error) {
      console.error('Get users error:', error);
      return serverErrorResponse('Failed to get users');
    }
  })(request);
}
