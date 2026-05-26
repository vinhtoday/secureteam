// POST /api/v1/calls/[id]/leave
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, serverErrorResponse } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const { id } = await context.params

      await db.callParticipant.updateMany({
        where: { callId: id, userId },
        data: { status: 'left', leftAt: new Date() },
      })

      return successResponse({ success: true })
    } catch (error) {
      console.error('Leave call error:', error)
      return serverErrorResponse('Failed to leave call')
    }
  })(request, context)
}
