// POST /api/v1/channels/[id]/members - Add member
// DELETE is handled in a separate route: /api/v1/channels/[id]/members/[userId]
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { isChannelAdmin, isChannelMember } from '@/lib/rbac-middleware';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  conflictResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'member']).default('member'),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;

      // Check if requester is channel admin
      const isAdmin = await isChannelAdmin(userId, channelId);
      if (!isAdmin) {
        return forbiddenResponse('Only channel admins can add members');
      }

      const body = await req.json();
      const result = addMemberSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { userId: targetUserId, role } = result.data;

      // Check if target user exists
      const targetUser = await db.user.findUnique({
        where: { id: targetUserId, isActive: true },
      });
      if (!targetUser) {
        return notFoundResponse('User not found');
      }

      // Check if channel exists
      const channel = await db.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return notFoundResponse('Channel not found');
      }

      // Check if already a member
      const existingMember = await db.channelMember.findUnique({
        where: {
          userId_channelId: { userId: targetUserId, channelId },
        },
      });
      if (existingMember) {
        return conflictResponse('User is already a member of this channel');
      }

      // Add member
      const member = await db.channelMember.create({
        data: {
          userId: targetUserId,
          channelId,
          role,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return successResponse(member, {}, 201);
    } catch (error) {
      console.error('Add channel member error:', error);
      return serverErrorResponse('Failed to add channel member');
    }
  })(request, context);
}
