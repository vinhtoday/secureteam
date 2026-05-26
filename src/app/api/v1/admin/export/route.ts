// POST /api/v1/admin/export - Export data (Super Admin)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { requireRole } from '@/lib/rbac-middleware';
import { ROLES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';
import {
  successResponse,
  forbiddenResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const exportSchema = z.object({
  type: z.enum(['messages', 'users', 'audit']),
  filters: z.object({
    userId: z.string().optional(),
    channelId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      // Check SUPER_ADMIN role
      const rbacCheck = requireRole(ROLES.SUPER_ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      const adminUserId = getUserId(req);
      const body = await req.json();
      const result = exportSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { type, filters } = result.data;

      let data: unknown;

      switch (type) {
        case 'messages': {
          const where: Record<string, unknown> = {};
          if (filters?.userId) where.senderId = filters.userId;
          if (filters?.channelId) where.channelId = filters.channelId;
          if (filters?.search) where.content = { contains: filters.search };
          if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
              (where.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
              const end = new Date(filters.endDate);
              end.setDate(end.getDate() + 1);
              (where.createdAt as Record<string, unknown>).lt = end;
            }
          }

          data = await db.message.findMany({
            where,
            select: {
              id: true,
              content: true,
              contentType: true,
              createdAt: true,
              fileUrl: true,
              fileName: true,
              channel: { select: { name: true, type: true } },
              sender: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1000,
          });
          break;
        }

        case 'users': {
          data = await db.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              isActive: true,
              isLocked: true,
              isEmailVerified: true,
              twoFactorEnabled: true,
              lastSeen: true,
              onlineStatus: true,
              createdAt: true,
              role: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });
          break;
        }

        case 'audit': {
          const whereAudit: Record<string, unknown> = {};
          if (filters?.userId) whereAudit.userId = filters.userId;
          if (filters?.startDate || filters?.endDate) {
            whereAudit.createdAt = {};
            if (filters.startDate) {
              (whereAudit.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
              const end = new Date(filters.endDate);
              end.setDate(end.getDate() + 1);
              (whereAudit.createdAt as Record<string, unknown>).lt = end;
            }
          }

          data = await db.auditLog.findMany({
            where: whereAudit,
            select: {
              id: true,
              action: true,
              target: true,
              details: true,
              ipAddress: true,
              createdAt: true,
              user: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1000,
          });
          break;
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DATA_EXPORT',
          target: type,
          details: JSON.stringify(filters ?? {}),
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        },
      });

      return successResponse({
        type,
        exportDate: new Date().toISOString(),
        totalRecords: Array.isArray(data) ? data.length : 0,
        data,
      });
    } catch (error) {
      console.error('Export error:', error);
      return serverErrorResponse('Export failed');
    }
  })(request);
}
