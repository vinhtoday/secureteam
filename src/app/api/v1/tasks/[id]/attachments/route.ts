// GET/POST /api/v1/tasks/[taskId]/attachments
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, getUserId, type AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  successResponse,
  notFoundResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { createNotification } from '@/lib/notification-helper';

const uploadSchema = z.object({
  fileName: z.string().min(1, 'Tên file là bắt buộc').max(255),
  fileUrl: z.string().url('URL file không hợp lệ'),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

// GET /api/v1/tasks/[taskId]/attachments — List attachments
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const { id } = await context.params;
      const taskId = id;

      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const attachments = await db.taskAttachment.findMany({
        where: { taskId },
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return successResponse(attachments);
    } catch (error) {
      console.error('List task attachments error:', error);
      return serverErrorResponse('Không thể tải danh sách tệp đính kèm');
    }
  })(request, context);
}

// POST /api/v1/tasks/[taskId]/attachments — Upload attachment
export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = getUserId(req);
      const { id } = await context.params;
      const taskId = id;
      const body = await req.json();
      const result = uploadSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { fileName, fileUrl, fileSize, mimeType } = result.data;

      // Verify task exists
      const task = await db.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return notFoundResponse('Công việc không tồn tại');
      }

      const attachment = await db.taskAttachment.create({
        data: {
          taskId,
          userId,
          fileName,
          fileUrl,
          fileSize,
          mimeType,
        },
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Create activity log
      await db.taskActivity.create({
        data: {
          taskId,
          userId,
          action: 'attachment_added',
          newValue: JSON.stringify({ fileName, fileSize }),
        },
      });

      // Notify assignees about new attachment
      const assignments = await db.taskAssignment.findMany({
        where: { taskId },
        select: { userId: true },
      });
      const recipientIds = assignments
        .map((a) => a.userId)
        .filter((uid) => uid !== userId);

      if (recipientIds.length > 0) {
        const notifyPromises = recipientIds.map((uid) =>
          createNotification({
            recipientId: uid,
            senderId: userId,
            type: 'task_updated',
            title: 'Tệp đính kèm mới',
            body: `"${task.title}" - ${fileName} đã được thêm`,
            link: `/tasks/${taskId}`,
            metadata: { taskId, attachmentId: attachment.id },
          })
        );
        await Promise.all(notifyPromises);
      }

      return successResponse(attachment, {}, 201);
    } catch (error) {
      console.error('Create task attachment error:', error);
      return serverErrorResponse('Không thể tải tệp đính kèm');
    }
  })(request, context);
}
