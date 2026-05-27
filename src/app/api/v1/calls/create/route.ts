// POST /api/v1/calls/create
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

const VALID_CALL_TYPES = ['voice', 'video', 'group_voice', 'group_video'];

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const body = await request.json();
      const { type, title, participantIds, channelId, maxParticipants } = body;

      // Validate call type
      if (!type || !VALID_CALL_TYPES.includes(type)) {
        return errorResponse('VALIDATION_ERROR', `Invalid call type. Must be one of: ${VALID_CALL_TYPES.join(', ')}`);
      }

      // Validate participantIds
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return errorResponse('VALIDATION_ERROR', 'At least one participant is required');
      }

      // Filter out null/undefined/non-string values
      const cleanParticipantIds = participantIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');

      if (cleanParticipantIds.length === 0) {
        return errorResponse('VALIDATION_ERROR', 'At least one valid participant is required');
      }

      // Validate maxParticipants
      const maxPart = typeof maxParticipants === 'number' ? Math.min(maxParticipants, 100) : 30;

      // Validate all participant users exist
      const users = await db.user.findMany({
        where: { id: { in: cleanParticipantIds } },
        select: { id: true, name: true, isActive: true },
      });

      if (users.length !== cleanParticipantIds.length) {
        const foundIds = new Set(users.map((u) => u.id));
        const missing = cleanParticipantIds.filter((id: string) => !foundIds.has(id));
        return errorResponse('VALIDATION_ERROR', `Users not found: ${missing.join(', ')}`);
      }

      // Filter out inactive users
      const activeParticipantIds = users.filter((u) => u.isActive).map((u) => u.id);
      if (activeParticipantIds.length === 0) {
        return errorResponse('VALIDATION_ERROR', 'No active participants found');
      }

      // Create call room with participants
      const callRoom = await db.callRoom.create({
        data: {
          title: title || null,
          type,
          status: 'waiting',
          channelId: channelId || null,
          createdBy: userId,
          maxParticipants: maxPart,
          participants: {
            create: [
              // Creator is the host
              {
                userId,
                role: 'host',
                status: 'joined',
                joinedAt: new Date(),
              },
              // Other participants are ringing
              ...activeParticipantIds
                .filter((id) => id !== userId)
                .map((pId) => ({
                  userId: pId,
                  role: 'participant',
                  status: 'ringing',
                })),
            ],
          },
        },
        include: {
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true, onlineStatus: true },
              },
            },
          },
        },
      });

      return successResponse({
        ...callRoom,
        participantCount: callRoom.participants.length,
      });
    } catch (error) {
      console.error('Create call error:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        return serverErrorResponse(`Failed to create call: ${error.message}`);
      }
      return serverErrorResponse('Failed to create call');
    }
  })(request);
}
