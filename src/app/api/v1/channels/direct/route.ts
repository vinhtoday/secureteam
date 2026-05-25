// POST /api/v1/channels/direct - Create or get DM channel
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import {
  successResponse,
  notFoundResponse,
  conflictResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const directMessageSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = directMessageSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { userId: targetUserId } = result.data;

      // Can't DM yourself
      if (targetUserId === userId) {
        return conflictResponse('Cannot create a direct message with yourself');
      }

      // Check if target user exists and is active
      const targetUser = await db.user.findUnique({
        where: { id: targetUserId, isActive: true },
        select: { id: true, name: true, avatar: true },
      });
      if (!targetUser) {
        return notFoundResponse('User not found');
      }

      // Check if a DM channel already exists between these two users
      const existingMemberships = await db.channelMember.findMany({
        where: {
          userId: { in: [userId, targetUserId] },
          channel: { type: 'direct' },
        },
        select: {
          channelId: true,
          userId: true,
        },
      });

      // Find channels where both users are members
      const channelUserMap = new Map<string, Set<string>>();
      for (const membership of existingMemberships) {
        if (!channelUserMap.has(membership.channelId)) {
          channelUserMap.set(membership.channelId, new Set());
        }
        channelUserMap.get(membership.channelId)!.add(membership.userId);
      }

      let existingChannelId: string | undefined;
      for (const [channelId, members] of channelUserMap) {
        if (members.has(userId) && members.has(targetUserId)) {
          existingChannelId = channelId;
          break;
        }
      }

      if (existingChannelId) {
        // Return existing DM channel
        const channel = await db.channel.findUnique({
          where: { id: existingChannelId },
          include: {
            members: {
              select: {
                role: true,
                user: {
                  select: { id: true, name: true, avatar: true, onlineStatus: true },
                },
              },
            },
          },
        });
        return successResponse(channel);
      }

      // Create new DM channel
      const channel = await db.channel.create({
        data: {
          name: `DM: ${userId.substring(0, 6)} & ${targetUserId.substring(0, 6)}`,
          type: 'direct',
          ownerId: userId,
          members: {
            createMany: {
              data: [
                { userId, role: 'member' },
                { userId: targetUserId, role: 'member' },
              ],
            },
          },
        },
        include: {
          members: {
            select: {
              role: true,
              user: {
                select: { id: true, name: true, avatar: true, onlineStatus: true },
              },
            },
          },
        },
      });

      return successResponse(channel, {}, 201);
    } catch (error) {
      console.error('Create DM channel error:', error);
      return serverErrorResponse('Failed to create direct message channel');
    }
  })(request);
}
