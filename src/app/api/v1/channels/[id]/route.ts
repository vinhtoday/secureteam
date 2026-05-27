// GET /api/v1/channels/[id]
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { isChannelMember } from '@/lib/rbac-middleware';
import { successResponse, notFoundResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

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
