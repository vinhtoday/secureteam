// GET /api/v1/calls/history
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, serverErrorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)

      const calls = await db.callRoom.findMany({
        where: {
          status: 'ended',
          participants: { some: { userId } },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
          creator: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { endedAt: 'desc' },
        take: 50,
      })

      return successResponse(calls)
    } catch (error) {
      console.error('Get call history error:', error)
      return serverErrorResponse('Failed to fetch call history')
    }
  })(request)
}
