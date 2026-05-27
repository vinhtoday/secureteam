// POST /api/v1/calls/[id]/end
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId, getUserRole } from '@/lib/auth-middleware';
import { requireMinimumRole } from '@/lib/rbac-middleware';
import { ROLES } from '@/lib/constants';
import { successResponse, notFoundResponse, forbiddenResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const userRole = getUserRole(req);
      const params = await context.params;
      const callId = params.id;

      // Find the call room
      const callRoom = await db.callRoom.findUnique({
        where: { id: callId },
        include: {
          participants: true,
        },
      });

      if (!callRoom) {
        return notFoundResponse('Call not found');
      }

      if (callRoom.status === 'ended') {
        return errorResponse('CALL_ENDED', 'This call has already ended');
      }

      // Check permissions: host, co_host, or admin can end call
      const participant = callRoom.participants.find((p) => p.userId === userId);
      const isHostOrCohost = participant && ['host', 'co_host'].includes(participant.role);
      const isAdminCheck = !requireMinimumRole(ROLES.ADMIN)(userRole);

      if (!isHostOrCohost && isAdminCheck) {
        return forbiddenResponse('Only the host, co-host, or admin can end this call');
      }

      // End the call
      const now = new Date();
      const duration = callRoom.startedAt
        ? Math.round((now.getTime() - callRoom.startedAt.getTime()) / 1000)
        : 0;

      await db.callRoom.update({
        where: { id: callId },
        data: {
          status: 'ended',
          endedAt: now,
          duration,
        },
      });

      // Mark all joined participants as left
      await db.callParticipant.updateMany({
        where: {
          callId,
          status: 'joined',
        },
        data: {
          status: 'left',
          leftAt: now,
        },
      });

      // Return updated room
      const updatedRoom = await db.callRoom.findUnique({
        where: { id: callId },
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, avatar: true, onlineStatus: true } },
            },
            orderBy: { joinedAt: 'asc' },
          },
          recordings: {
            select: { id: true, type: true, status: true, duration: true, createdAt: true },
          },
        },
      });

      return successResponse({
        ...updatedRoom,
        participantCount: updatedRoom!.participants.length,
        activeParticipants: 0,
        endedBy: userId,
      });
    } catch (error) {
      console.error('End call error:', error);
      return serverErrorResponse('Failed to end call');
    }
  })(request, context);
}
