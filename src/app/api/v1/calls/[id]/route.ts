// GET /api/v1/calls/[id]
// DELETE /api/v1/calls/[id] — End a call
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getUserId, getUserRole } from '@/lib/auth-middleware'
import { successResponse, notFoundResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const { id } = await context.params

      const callRoom = await db.callRoom.findFirst({
        where: {
          id,
          participants: { some: { userId } },
        },
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
      console.error('Get call error:', error)
      return serverErrorResponse('Failed to fetch call')
    }
  })(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const userRole = getUserRole(req)
      const { id } = await context.params

      // Fetch existing call
      const existingCall = await db.callRoom.findUnique({ where: { id } })
      if (!existingCall) {
        return notFoundResponse('Call not found')
      }

      // Permission check: only host, admin, or SUPER_ADMIN can end call via DELETE
      const participant = await db.callParticipant.findUnique({
        where: { callId_userId: { callId: id, userId } },
      })
      const isHost = participant?.role === 'host' || participant?.role === 'co_host'
      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '')

      if (!isHost && !isAdmin && existingCall.createdBy !== userId) {
        return forbiddenResponse('Bạn không có quyền kết thúc cuộc gọi này')
      }

      const duration = Math.floor(
        (Date.now() - new Date(existingCall.startedAt).getTime()) / 1000
      )

      const callRoom = await db.callRoom.update({
        where: { id },
        data: {
          status: 'ended',
          endedAt: new Date(),
          duration,
        },
      })

      return successResponse(callRoom)
    } catch (error) {
      console.error('End call error:', error)
      return serverErrorResponse('Failed to end call')
    }
  })(request, context)
}
