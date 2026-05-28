// GET /PATCH/DELETE /api/v1/channels/[id]
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { isChannelMember } from '@/lib/rbac-middleware';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationResponse,
} from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;

      // Check membership
      const isMember = await isChannelMember(userId, channelId);
      if (!isMember) {
        return forbiddenResponse('You do not have access to this channel');
      }

      const channel = await db.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          avatar: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            select: {
              userId: true,
              role: true,
              joinedAt: true,
              muted: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  onlineStatus: true,
                  isBot: true,
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      if (!channel) {
        return notFoundResponse('Channel not found');
      }

      return successResponse({
        ...channel,
        messageCount: channel._count.messages,
        _count: undefined,
      });
    } catch (error) {
      console.error('Get channel error:', error);
      return serverErrorResponse('Failed to get channel');
    }
  })(request, context);
}

const updateChannelSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;
      const body = await req.json();

      const result = updateChannelSchema.safeParse(body);
      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const channel = await db.channel.findUnique({
        where: { id: channelId },
      });

      if (!channel) {
        return notFoundResponse('Không tìm thấy nhóm');
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      const isAuthorized =
        channel.ownerId === userId ||
        user?.role?.name === 'SUPER_ADMIN' ||
        user?.role?.name === 'ADMIN';

      if (!isAuthorized) {
        return forbiddenResponse('Bạn không có quyền chỉnh sửa nhóm này');
      }

      const updated = await db.channel.update({
        where: { id: channelId },
        data: result.data,
      });

      return successResponse(updated);
    } catch (error) {
      console.error('Update channel error:', error);
      return serverErrorResponse('Không thể cập nhật thông tin nhóm');
    }
  })(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;

      const channel = await db.channel.findUnique({
        where: { id: channelId },
      });

      if (!channel) {
        return notFoundResponse('Không tìm thấy nhóm');
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      const isAuthorized =
        channel.ownerId === userId ||
        user?.role?.name === 'SUPER_ADMIN' ||
        user?.role?.name === 'ADMIN';

      if (!isAuthorized) {
        return forbiddenResponse('Bạn không có quyền xóa nhóm này');
      }

      await db.channel.delete({
        where: { id: channelId },
      });

      return successResponse({ deleted: true });
    } catch (error) {
      console.error('Delete channel error:', error);
      return serverErrorResponse('Không thể xóa nhóm');
    }
  })(request, context);
}
