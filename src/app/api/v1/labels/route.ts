// GET/POST /api/v1/labels
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  notFoundResponse,
  conflictResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const createLabelSchema = z.object({
  name: z.string().min(1, 'Tên nhãn là bắt buộc').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu không hợp lệ (định dạng #RRGGBB)').default('#6366f1'),
});

// GET /api/v1/labels — List all labels
export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const labels = await db.label.findMany({
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          creator: {
            select: { id: true, name: true },
          },
          _count: {
            select: { taskLabels: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Map taskLabels count to assignments for frontend compatibility
      const mapped = labels.map((l) => ({
        ...l,
        _count: { assignments: l._count.taskLabels },
      }));

      return successResponse(mapped);
    } catch (error) {
      console.error('List labels error:', error);
      return serverErrorResponse('Không thể tải danh sách nhãn');
    }
  })(request);
}

// POST /api/v1/labels — Create label
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = createLabelSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { name, color } = result.data;

      // Check for duplicate name
      const existing = await db.label.findUnique({ where: { name } });
      if (existing) {
        return conflictResponse('Nhãn với tên này đã tồn tại');
      }

      const label = await db.label.create({
        data: {
          name,
          color,
          createdBy: userId,
        },
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          creator: {
            select: { id: true, name: true },
          },
          _count: {
            select: { taskLabels: true },
          },
        },
      });

      const mapped = {
        ...label,
        _count: { assignments: label._count.taskLabels },
      };

      return successResponse(mapped, {}, 201);
    } catch (error) {
      console.error('Create label error:', error);
      return serverErrorResponse('Không thể tạo nhãn');
    }
  })(request);
}
