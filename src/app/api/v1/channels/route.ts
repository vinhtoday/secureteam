// GET /api/v1/channels
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type');
      const search = searchParams.get('search');

      // Build where clause for channels where user is a member
      const where: Record<string, unknown> = {
        members: { some: { userId } },
        isArchived: false,
      };

      if (type && ['public', 'private', 'direct'].includes(type)) {
        where.type = type;
      }

      if (search) {
        where.name = { contains: search };
      }

      const channels = await db.channel.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            select: { userId: true },
          },
          _count: {
            select: { members: true, messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Get last message for each channel
      const channelsWithLastMessage = await Promise.all(
        channels.map(async (channel) => {
          const lastMessage = await db.message.findFirst({
            where: { channelId: channel.id },
            select: {
              id: true,
              content: true,
              createdAt: true,
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          return {
            ...channel,
            memberCount: channel._count.members,
            messageCount: channel._count.messages,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content?.substring(0, 100),
                  createdAt: lastMessage.createdAt,
                  sender: lastMessage.sender,
                }
              : null,
            _count: undefined,
          };
        })
      );

      return successResponse(channelsWithLastMessage);
    } catch (error) {
      console.error('Get channels error:', error);
      return serverErrorResponse('Failed to get channels');
    }
  })(request);
}

// POST /api/v1/channels
import { z } from 'zod';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES } from '@/lib/constants';
import { forbiddenResponse, validationResponse } from '@/lib/api-response';

const createChannelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private']).default('public'),
  memberIds: z.array(z.string()).optional(),
});

export { POST };

async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const roleName = req.user.roleName;
      const rbacCheck = requireMinimumRole(ROLES.LEADER)(roleName);
      if (rbacCheck) return rbacCheck;

      const userId = getUserId(req);
      const body = await req.json();
      const result = createChannelSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { name, description, type, memberIds } = result.data;

      // Check for duplicate channel name
      const existing = await db.channel.findFirst({
        where: { name: name.toLowerCase(), type },
      });
      if (existing) {
        return forbiddenResponse('Channel with this name already exists');
      }

      // Create channel
      const channel = await db.channel.create({
        data: {
          name: name.toLowerCase(),
          description,
          type,
          ownerId: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
        },
      });

      // Add creator as admin
      const membersToAdd = [{ userId, role: 'admin' as const }];

      // Add specified members
      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          if (memberId !== userId) {
            membersToAdd.push({ userId: memberId, role: 'member' as const });
          }
        }
      }

      await db.channelMember.createMany({
        data: membersToAdd.map((m) => ({
          userId: m.userId,
          channelId: channel.id,
          role: m.role,
        })),
      });

      return successResponse(channel, {}, 201);
    } catch (error) {
      console.error('Create channel error:', error);
      return serverErrorResponse('Failed to create channel');
    }
  })(request);
}
