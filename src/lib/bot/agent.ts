// SecureBot - Agent Loop
// Core ReAct-style agent: parse intent → pick tools → execute → respond

import ZAI from 'z-ai-web-dev-sdk'
import { SYSTEM_PROMPT, BOT_TOOLS, type BotMessage } from './system-prompt'
import { executeTool } from './tool-executor'

const MAX_TOOL_ROUNDS = 5 // Prevent infinite tool loops

interface AgentContext {
  userId: string
  channelId?: string
  userName: string
}

interface AgentResponse {
  content: string
  toolCalls?: Array<{
    name: string
    args: Record<string, unknown>
    result: unknown
  }>
}

/**
 * Run the SecureBot agent loop
 * 1. Build messages with system prompt + conversation history + user message
 * 2. Call LLM with tool definitions
 * 3. If LLM requests tool calls → execute them → feed results back → call LLM again
 * 4. Return final response
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: AgentContext
): Promise<AgentResponse> {
  // Build initial messages
  const messages: BotMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n## Thông tin người dùng hiện tại:\n- ID: ${context.userId}\n- Tên: ${context.userName}`,
    },
  ]

  // Add conversation history (last 8 messages)
  const recentHistory = conversationHistory.slice(-8)
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  // Add current message
  messages.push({ role: 'user', content: userMessage })

  const toolCallsLog: AgentResponse['toolCalls'] = []

  let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
  try {
    zai = await ZAI.create()
  } catch (error) {
    console.error('[SecureBot] Failed to initialize ZAI:', error)
    return {
      content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
    }
  }

  // Agent loop
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: messages as any,
        tools: BOT_TOOLS.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        temperature: 0.3,
        max_tokens: 2048,
      })

      const choice = completion.choices[0]
      if (!choice?.message) {
        return { content: 'Xin lỗi, tôi không thể xử lý yêu cầu lúc này. Vui lòng thử lại.' }
      }

      const assistantMessage = choice.message

      // If LLM wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant message with tool calls to conversation
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls,
        })

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name
          let functionArgs: Record<string, unknown> = {}
          try {
            functionArgs = JSON.parse(toolCall.function.arguments)
          } catch {
            functionArgs = {}
          }

          console.log(`[SecureBot] Executing tool: ${functionName}`, functionArgs)

          // Execute the tool
          const result = await executeTool(functionName, functionArgs, {
            userId: context.userId,
            channelId: context.channelId,
          })

          const resultContent = JSON.stringify({
            success: result.success,
            data: result.data,
            error: result.error,
          })

          // Log tool call
          toolCallsLog.push({
            name: functionName,
            args: functionArgs,
            result: result.data,
          })

          // Add tool result to messages
          messages.push({
            role: 'tool',
            content: resultContent,
            tool_call_id: toolCall.id,
          })
        }

        // Continue loop to let LLM process tool results
        continue
      }

      // No tool calls — return final response
      return {
        content: assistantMessage.content || 'Xin lỗi, tôi không thể xử lý yêu cầu lúc này.',
        toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
      }
    } catch (error) {
      console.error(`[SecureBot] Agent loop error (round ${round}):`, error)
      if (round === MAX_TOOL_ROUNDS - 1) {
        return {
          content: 'Xin lỗi, tôi đã gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại hoặc hỏi lại theo cách khác.',
          toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
        }
      }
      // Try next round on error
      continue
    }
  }

  return {
    content: 'Xin lỗi, việc xử lý đã vượt quá giới hạn. Vui lòng thử lại.',
    toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
  }
}
