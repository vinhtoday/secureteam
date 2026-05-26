// POST /api/v1/calls/[id]/join
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const { id } = await context.params

      // Update participant status
      await db.callParticipant.updateMany({
        where: { callId: id, userId },
        data: { status: 'joined', joinedAt: new Date() },
      })

      // Update call status to active if ringing
      await db.callRoom.updateMany({
        where: { id, status: 'ringing' },
        data: { status: 'active' },
      })

      const callRoom = await db.callRoom.findUnique({
        where: { id },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true, onlineStatus: true } } },
          },
          creator: { select: { id: true, name: true, avatar: true } },
          channel: { select: { id: true, name: true } },
        },
      })

      if (!callRoom) {
        return notFoundResponse('Call not found')
      }

      return successResponse(callRoom)
    } catch (error) {
      console.error('Join call error:', error)
      return serverErrorResponse('Failed to join call')
    }
  })(request, context)
}
