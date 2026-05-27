import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'

const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
})

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; messageId: string }> }
) {
  const params = await props.params;
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const channelId = params.id
      const messageId = params.messageId

      const body = await req.json()
      const parseResult = reactSchema.safeParse(body)
      if (!parseResult.success) {
        return errorResponse('BAD_REQUEST', 'Invalid reaction body', undefined, 400)
      }
      const { emoji } = parseResult.data

      // Check if message exists in the specified channel
      const message = await db.message.findFirst({
        where: { id: messageId, channelId },
      })

      if (!message) {
        return errorResponse('NOT_FOUND', 'Message not found', undefined, 404)
      }

      // Check user membership in the channel
      const membership = await db.channelMember.findUnique({
        where: { userId_channelId: { userId, channelId } },
      })
      if (!membership) {
        return errorResponse('FORBIDDEN', 'You are not a member of this channel', undefined, 403)
      }

      // Parse metadata
      let metadata: Record<string, any> = {}
      try {
        metadata = message.metadata ? JSON.parse(message.metadata) : {}
      } catch {
        metadata = {}
      }

      if (!metadata.reactions || typeof metadata.reactions !== 'object') {
        metadata.reactions = {}
      }

      const reactions = metadata.reactions as Record<string, string[]>

      if (!reactions[emoji]) {
        reactions[emoji] = []
      }

      const userIndex = reactions[emoji].indexOf(userId)
      if (userIndex > -1) {
        // Toggle off: remove user reaction
        reactions[emoji].splice(userIndex, 1)
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }
      } else {
        // Toggle on: add user reaction
        reactions[emoji].push(userId)
      }

      // Save back to db
      const updatedMetadata = JSON.stringify(metadata)
      await db.message.update({
        where: { id: messageId },
        data: { metadata: updatedMetadata },
      })

      return successResponse({
        messageId,
        reactions: metadata.reactions,
      })
    } catch (error) {
      console.error('[Reactions API] Error toggling reaction:', error)
      return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to toggle reaction', undefined, 500)
    }
  })(request)
}
