// POST /api/v1/bot/chat - SecureBot Chat Endpoint
// Receives user message, runs agent, saves bot response, returns it
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { getUserId } from '@/lib/auth-middleware'
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api-response'
import { runAgent } from '@/lib/bot/agent'

const botChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  channelId: z.string().optional(),
  conversationHistory: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional()
    .default([]),
})

async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)
      const body = await req.json()
      const result = botChatSchema.safeParse(body)

      if (!result.success) {
        return errorResponse('BAD_REQUEST', 'Invalid request body', undefined, 400)
      }

      const { message, channelId, conversationHistory } = result.data

      // Get current user info for context
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      // Get or create bot user
      let botUser = await db.user.findFirst({ where: { isBot: true } })
      if (!botUser) {
        console.log('[SecureBot] Bot user not found, creating...')
        let botRole = await db.role.findFirst({ where: { name: 'BOT' } })
        if (!botRole) {
          botRole = await db.role.create({
            data: {
              name: 'BOT',
              description: 'AI Bot assistant',
              permissions: JSON.stringify({ isBot: true }),
            },
          })
        }
        botUser = await db.user.create({
          data: {
            email: `securebot@secureteam.internal`,
            passwordHash: 'bot_no_login',
            name: 'SecureBot',
            bio: 'Trợ lý AI thông minh của SecureTeam',
            roleId: botRole.id,
            isBot: true,
            isActive: true,
            isEmailVerified: true,
            onlineStatus: 'online',
          },
        })
        console.log(`[SecureBot] Bot user created: ${botUser.id}`)
      }

      // Run the agent
      const userName = currentUser?.name || 'Người dùng'
      console.log(`[SecureBot] Processing message from ${userName}: "${message.substring(0, 50)}..."`)
      const agentResponse = await runAgent(message, conversationHistory, {
        userId,
        channelId,
        userName,
      })

      console.log(`[SecureBot] Agent response: "${agentResponse.content.substring(0, 100)}..."`)

      // Save bot response as a message (if channelId provided)
      let savedMessage: Record<string, unknown> | null = null
      if (channelId) {
        // Verify membership
        const isMember = await db.channelMember.findUnique({
          where: { userId_channelId: { userId, channelId } },
        })
        if (isMember) {
          // Ensure bot is also a member of the channel
          const botMembership = await db.channelMember.findUnique({
            where: { userId_channelId: { userId: botUser.id, channelId } },
          })
          if (!botMembership) {
            await db.channelMember.create({
              data: { userId: botUser.id, channelId, role: 'member' },
            })
          }

          // Save bot message
          savedMessage = await db.message.create({
            data: {
              channelId,
              senderId: botUser.id,
              content: agentResponse.content,
              contentType: 'text',
              metadata: agentResponse.toolCalls
                ? JSON.stringify({ toolCalls: agentResponse.toolCalls })
                : undefined,
            },
            select: {
              id: true,
              content: true,
              contentType: true,
              createdAt: true,
              metadata: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  onlineStatus: true,
                },
              },
            },
          })

          // Update channel's updatedAt
          await db.channel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
          })
        }
      }

      return successResponse({
        content: agentResponse.content,
        toolCalls: agentResponse.toolCalls,
        message: savedMessage,
        botUserId: botUser.id,
      })
    } catch (error) {
      console.error('[SecureBot] Chat error:', error)
      return serverErrorResponse('Failed to process bot chat')
    }
  })(request)
}

export { POST }
