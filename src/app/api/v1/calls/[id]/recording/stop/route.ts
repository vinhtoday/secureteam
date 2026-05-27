// POST /api/v1/calls/[id]/recording/stop
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

      // Only admin or leader can stop recording
      const rbacCheck = requireMinimumRole(ROLES.LEADER)(userRole);
      if (rbacCheck) return rbacCheck;

      // Find active recording for this call
      const recording = await db.callRecording.findFirst({
        where: {
          callId,
          status: 'processing',
        },
      });

      if (!recording) {
        return notFoundResponse('No active recording found for this call');
      }

      // Calculate recording duration
      const duration = Math.round(
        (new Date().getTime() - recording.createdAt.getTime()) / 1000
      );

      // Update recording status
      const updatedRecording = await db.callRecording.update({
        where: { id: recording.id },
        data: {
          status: 'ready',
          duration,
        },
        include: {
          starter: {
            select: { id: true, name: true, avatar: true },
          },
          call: {
            select: { id: true, title: true, type: true },
          },
        },
      });

      return successResponse({
        recording: updatedRecording,
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      return serverErrorResponse('Failed to stop recording');
    }
  })(request, context);
}
