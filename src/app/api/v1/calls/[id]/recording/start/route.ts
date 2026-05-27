// POST /api/v1/calls/[id]/recording/start
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
      const body = await request.json();
      const { type = 'audio' } = body;

      // Only admin or leader can start recording
      const rbacCheck = requireMinimumRole(ROLES.LEADER)(userRole);
      if (rbacCheck) return rbacCheck;

      // Validate recording type
      const validTypes = ['audio', 'video', 'screen'];
      if (!validTypes.includes(type)) {
        return errorResponse('VALIDATION_ERROR', `Invalid recording type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Check if call exists and is active
      const callRoom = await db.callRoom.findUnique({
        where: { id: callId },
      });

      if (!callRoom) {
        return notFoundResponse('Call not found');
      }

      if (callRoom.status !== 'active') {
        return errorResponse('CALL_NOT_ACTIVE', 'Recording can only be started on active calls');
      }

      // Check for existing active recording on this call
      const existingRecording = await db.callRecording.findFirst({
        where: {
          callId,
          status: 'processing',
        },
      });

      if (existingRecording) {
        return errorResponse('RECORDING_ACTIVE', 'A recording is already in progress for this call');
      }

      // Create recording entry
      const recording = await db.callRecording.create({
        data: {
          callId,
          type,
          status: 'processing',
          startedBy: userId,
        },
        include: {
          starter: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return successResponse({
        recording,
      });
    } catch (error) {
      console.error('Start recording error:', error);
      return serverErrorResponse('Failed to start recording');
    }
  })(request, context);
}
