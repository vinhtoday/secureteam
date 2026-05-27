// PATCH/DELETE /api/v1/labels/[id]
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

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu không hợp lệ (định dạng #RRGGBB)').optional(),
});

// PATCH /api/v1/labels/[id] — Update label
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const result = updateLabelSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const label = await db.taskLabel.findUnique({ where: { id } });
      if (!label) {
        return notFoundResponse('Nhãn không tồn tại');
      }

      // Check for duplicate name if changing name
      if (result.data.name && result.data.name !== label.name) {
        const existing = await db.taskLabel.findUnique({
          where: { name: result.data.name },
        });
        if (existing) {
          return conflictResponse('Nhãn với tên này đã tồn tại');
        }
      }

      const updated = await db.taskLabel.update({
        where: { id },
        data: result.data,
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          creator: {
            select: { id: true, name: true },
          },
          _count: {
            select: { assignments: true },
          },
        },
      });

      return successResponse(updated);
    } catch (error) {
      console.error('Update label error:', error);
      return serverErrorResponse('Không thể cập nhật nhãn');
    }
  })(request, context);
}

// DELETE /api/v1/labels/[id] — Delete label
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const { id } = await context.params;

      const label = await db.taskLabel.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
      if (!label) {
        return notFoundResponse('Nhãn không tồn tại');
      }

      // Cascade will delete TaskLabelAssignment records
      await db.taskLabel.delete({ where: { id } });

      return successResponse({ id, name: label.name, deleted: true });
    } catch (error) {
      console.error('Delete label error:', error);
      return serverErrorResponse('Không thể xóa nhãn');
    }
  })(request, context);
}
