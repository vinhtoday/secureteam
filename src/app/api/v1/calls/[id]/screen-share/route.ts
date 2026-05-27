// POST /api/v1/calls/[id]/screen-share
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, notFoundResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

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
      const { sharing } = body;

      if (sharing === undefined) {
        return errorResponse('VALIDATION_ERROR', 'sharing field is required');
      }

      // Update participant's screen sharing status
      const updatedParticipant = await db.callParticipant.update({
        where: {
          callId_userId: { callId, userId },
        },
        data: {
          isScreenSharing: Boolean(sharing),
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, onlineStatus: true },
          },
        },
      });

      if (!updatedParticipant) {
        return notFoundResponse('Participant not found in this call');
      }

      return successResponse({
        participant: updatedParticipant,
      });
    } catch (error) {
      console.error('Screen share error:', error);
      return serverErrorResponse('Failed to update screen sharing status');
    }
  })(request, context);
}
