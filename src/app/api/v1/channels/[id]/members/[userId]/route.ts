// DELETE /api/v1/channels/[id]/members/[userId]
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { isChannelAdmin } from '@/lib/rbac-middleware';
import { notFoundResponse, forbiddenResponse, nullResponse, serverErrorResponse } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;
      const targetUserId = params.userId;

      // Admin can remove anyone, user can remove themselves
      const isAdmin = await isChannelAdmin(userId, channelId);
      const isSelf = userId === targetUserId;

      if (!isAdmin && !isSelf) {
        return forbiddenResponse('You can only remove yourself or be a channel admin');
      }

      // Check if member exists
      const member = await db.channelMember.findUnique({
        where: {
          userId_channelId: { userId: targetUserId, channelId },
        },
      });

      if (!member) {
        return notFoundResponse('Member not found in this channel');
      }

      // Remove member
      await db.channelMember.delete({
        where: { id: member.id },
      });

      return nullResponse();
    } catch (error) {
      console.error('Remove channel member error:', error);
      return serverErrorResponse('Failed to remove channel member');
    }
  })(request, context);
}
