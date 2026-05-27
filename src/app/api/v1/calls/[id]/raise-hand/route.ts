// POST /api/v1/calls/[id]/raise-hand
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
      const { raised } = body;

      if (raised === undefined) {
        return errorResponse('VALIDATION_ERROR', 'raised field is required');
      }

      // Update participant's raised hand status
      const updatedParticipant = await db.callParticipant.update({
        where: {
          callId_userId: { callId, userId },
        },
        data: {
          raisedHand: Boolean(raised),
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
      console.error('Raise hand error:', error);
      return serverErrorResponse('Failed to update hand raise status');
    }
  })(request, context);
}
