// POST /api/v1/calls — Create a new call
// GET /api/v1/calls — List user's calls
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const body = await req.json()
      const { type, title, participantIds, channelId } = body

      if (!type || !participantIds?.length) {
        return errorResponse('VALIDATION_ERROR', 'Missing required fields: type, participantIds', undefined, 400)
      }

      const callRoom = await db.callRoom.create({
        data: {
          title: title || 'Cuộc gọi',
          type,
          channelId: channelId || null,
          createdBy: userId,
          participants: {
            createMany: {
              data: [
                { userId, role: 'host', status: 'joined', joinedAt: new Date() },
                ...participantIds.map((id: string) => ({
                  userId: id,
                  role: 'participant',
                  status: 'ringing',
                })),
              ],
            },
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true, onlineStatus: true } } },
          },
          creator: { select: { id: true, name: true, avatar: true } },
          channel: { select: { id: true, name: true } },
        },
      })

      return successResponse(callRoom, undefined, 201)
    } catch (error) {
      console.error('Create call error:', error)
      return serverErrorResponse('Failed to create call')
    }
  })(request)
}

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)

      const calls = await db.callParticipant.findMany({
        where: { userId },
        include: {
          call: {
            include: {
              creator: { select: { id: true, name: true, avatar: true } },
              participants: {
                include: { user: { select: { id: true, name: true, avatar: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return successResponse(calls.map((cp) => cp.call))
    } catch (error) {
      console.error('Get calls error:', error)
      return serverErrorResponse('Failed to fetch calls')
    }
  })(request)
}
