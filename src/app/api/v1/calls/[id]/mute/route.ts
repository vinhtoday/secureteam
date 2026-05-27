// POST /api/v1/calls/[id]/mute
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId, getUserRole } from '@/lib/auth-middleware';
import { ROLES } from '@/lib/constants';
import { successResponse, notFoundResponse, forbiddenResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const callId = params.id;
      const body = await request.json();
      const { targetUserId, mute } = body;

      // Validate inputs
      if (targetUserId === undefined || mute === undefined) {
        return errorResponse('VALIDATION_ERROR', 'targetUserId and mute are required');
      }

      // User can mute themselves, host/co_host can mute others
      const isSelfMute = userId === targetUserId;

      if (!isSelfMute) {
        // Check if the caller has permission to mute others
        const callRoom = await db.callRoom.findUnique({
          where: { id: callId },
          include: { participants: true },
        });

        if (!callRoom) {
          return notFoundResponse('Call not found');
        }

        const callerParticipant = callRoom.participants.find((p) => p.userId === userId);
        if (!callerParticipant || !['host', 'co_host'].includes(callerParticipant.role)) {
          return forbiddenResponse('Only host or co-host can mute other participants');
        }
      }

      // Update target participant's mute status
      const updatedParticipant = await db.callParticipant.update({
        where: {
          callId_userId: { callId, userId: targetUserId },
        },
        data: {
          isMuted: Boolean(mute),
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, onlineStatus: true },
          },
        },
      });

      return successResponse({
        participant: updatedParticipant,
        mutedBy: userId,
      });
    } catch (error) {
      console.error('Mute call error:', error);
      return serverErrorResponse('Failed to update mute status');
    }
  })(request, context);
}
