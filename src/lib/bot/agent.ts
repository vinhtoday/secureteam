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
    console.warn('[SecureBot] ZAI SDK failed to initialize. Falling back to local agent loop.', error)
    return runLocalFallbackAgent(userMessage, context)
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

async function runLocalFallbackAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResponse> {
  const text = userMessage.trim();
  
  // 1. Online Users
  if (/^\s*(?:online|trực tuyến|ai online)\s*$/i.test(text)) {
    const res = await executeTool('get_online_users', {}, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as { message: string; users: Array<{ id: string; name: string; email: string; role: string }> };
      if (data.users && data.users.length > 0) {
        const usersStr = data.users.map(u => `- 🟢 **${u.name}** (${u.email}) - *${u.role}*`).join('\n');
        return {
          content: `🤖 **SecureBot** - Danh sách người dùng trực tuyến:\n\nHiện có **${data.users.length}** người đang online:\n${usersStr}`,
          toolCalls: [{ name: 'get_online_users', args: {}, result: res.data }]
        };
      }
      return {
        content: `🤖 **SecureBot** - Danh sách người dùng trực tuyến:\n\nHiện tại không có người dùng nào khác đang trực tuyến.`,
        toolCalls: [{ name: 'get_online_users', args: {}, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Đã xảy ra lỗi khi lấy danh sách người dùng online: ${res.error || 'Lỗi không xác định'}`
    };
  }

  // 2. Search User
  const searchMatch = text.match(/^\s*(?:tìm nhân viên|tìm người|tìm kiếm|tìm)\s+(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    const res = await executeTool('search_user', { query }, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as { message: string; users: Array<{ id: string; name: string; email: string; online: boolean; role: string }> };
      if (data.users && data.users.length > 0) {
        const usersStr = data.users.map(u => `- **${u.name}** (${u.email}) - Vai trò: *${u.role}* - Trạng thái: ${u.online ? '🟢 Trực tuyến' : '⚫ Ngoại tuyến'}`).join('\n');
        return {
          content: `🤖 **SecureBot** - Kết quả tìm kiếm cho từ khóa "${query}":\n\nTìm thấy **${data.users.length}** người dùng:\n${usersStr}`,
          toolCalls: [{ name: 'search_user', args: { query }, result: res.data }]
        };
      }
      return {
        content: `🤖 **SecureBot**: Không tìm thấy nhân viên nào khớp với từ khóa "${query}".`,
        toolCalls: [{ name: 'search_user', args: { query }, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Yêu cầu tìm kiếm thất bại. ${res.error || 'Từ khóa phải từ 2 ký tự trở lên.'}`
    };
  }

  // 3. My Info / Profile
  if (/^\s*(?:profile|thông tin của tôi|thông tin cá nhân|thông tin)\s*$/i.test(text)) {
    const res = await executeTool('get_my_info', {}, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as {
        id: string;
        name: string;
        email: string;
        bio?: string;
        online: boolean;
        role: string;
        channelCount: number;
        messageCount: number;
        twoFactorEnabled: boolean;
        joinedAt: Date | string;
      };
      const dateStr = new Date(data.joinedAt).toLocaleDateString('vi-VN');
      const infoStr = `🤖 **SecureBot** - Thông tin tài khoản của bạn:
- 👤 **Họ và tên:** ${data.name}
- 📧 **Email:** ${data.email}
- 🛡️ **Vai trò:** ${data.role}
- 🟢 **Trạng thái:** ${data.online ? 'Trực tuyến' : 'Ngoại tuyến'}
- 📝 **Tiểu sử:** ${data.bio || 'Chưa thiết lập'}
- 💬 **Số kênh tham gia:** ${data.channelCount}
- ✉️ **Số tin nhắn đã gửi:** ${data.messageCount}
- 🔑 **Bảo mật 2FA:** ${data.twoFactorEnabled ? '🔒 Đã kích hoạt' : '🔓 Chưa kích hoạt'}
- 📅 **Ngày tham gia:** ${dateStr}`;
      return {
        content: infoStr,
        toolCalls: [{ name: 'get_my_info', args: {}, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Lỗi khi truy vấn thông tin cá nhân: ${res.error || 'Lỗi không xác định'}`
    };
  }

  // 4. List Channels
  if (/^\s*(?:kênh của tôi|danh sách kênh|kênh)\s*$/i.test(text)) {
    const res = await executeTool('list_channels', {}, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as { message: string; channels: Array<{ id: string; name: string; description: string; type: string; memberCount: number; messageCount: number }> };
      if (data.channels && data.channels.length > 0) {
        const channelsStr = data.channels.map(ch => `- **#${ch.name}** (${ch.type === 'public' ? '📢 Công khai' : ch.type === 'private' ? '🔒 Riêng tư' : '💬 Tin nhắn trực tiếp'}) - *${ch.description || 'Không có mô tả'}* (${ch.memberCount} thành viên, ${ch.messageCount} tin nhắn)`).join('\n');
        return {
          content: `🤖 **SecureBot** - Kênh bạn tham gia:\n\nBạn đang có mặt trong **${data.channels.length}** kênh:\n${channelsStr}`,
          toolCalls: [{ name: 'list_channels', args: {}, result: res.data }]
        };
      }
      return {
        content: `🤖 **SecureBot**: Bạn hiện không tham gia kênh nào.`,
        toolCalls: [{ name: 'list_channels', args: {}, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Không thể lấy danh sách kênh. ${res.error || 'Lỗi hệ thống'}`
    };
  }

  // 5. My Tasks
  if (/^\s*(?:task của tôi|danh sách task|công việc của tôi|task)\s*$/i.test(text)) {
    const res = await executeTool('get_my_tasks', {}, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as { message?: string; tasks?: Array<{ id: string; title: string; description: string; status: string; priority: string; progress: number; dueDate: string | null; assigneeCount: number }> };
      if (data.tasks) {
        if (data.tasks.length > 0) {
          const priorityMap: Record<string, string> = { low: '🟢 Thấp', medium: '🟡 Trung bình', high: '🟠 Cao', urgent: '🔴 Khẩn cấp' };
          const statusMap: Record<string, string> = { todo: 'Cần làm', in_progress: 'Đang làm', review: 'Đang duyệt', done: 'Hoàn thành', cancelled: 'Đã hủy' };
          const tasksStr = data.tasks.map(t => {
            const dueDateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không giới hạn';
            return `- **${t.title}**\n  - Mức độ ưu tiên: ${priorityMap[t.priority] || t.priority}\n  - Trạng thái: \`${statusMap[t.status] || t.status}\` (Tiến độ: ${t.progress || 0}%)\n  - Hạn chót: ${dueDateStr}${t.description ? `\n  - Mô tả: *${t.description}*` : ''}`;
          }).join('\n');
          return {
            content: `🤖 **SecureBot** - Danh sách công việc của bạn:\n\nBạn được gán **${data.tasks.length}** công việc:\n${tasksStr}`,
            toolCalls: [{ name: 'get_my_tasks', args: {}, result: res.data }]
          };
        }
        return {
          content: `🤖 **SecureBot**: Bạn hiện không có công việc nào được giao.`,
          toolCalls: [{ name: 'get_my_tasks', args: {}, result: res.data }]
        };
      }
      return {
        content: `🤖 **SecureBot**: ${data.message || 'Chức năng quản lý công việc chưa khả dụng.'}`,
        toolCalls: [{ name: 'get_my_tasks', args: {}, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Lỗi khi lấy danh sách công việc. ${res.error || 'Lỗi hệ thống'}`
    };
  }

  // 6. Create Task
  const createTaskMatch = text.match(/^\s*(?:tạo task|tạo công việc)\s+(.+)$/i);
  if (createTaskMatch) {
    const title = createTaskMatch[1].trim();
    const res = await executeTool('create_task', { title }, { userId: context.userId, channelId: context.channelId });
    if (res.success && res.data) {
      const data = res.data as { message: string; task: { id: string; title: string; description: string; status: string; priority: string; assignee: string } };
      const t = data.task;
      const priorityStr = t.priority === 'low' ? '🟢 Thấp' : t.priority === 'medium' ? '🟡 Trung bình' : t.priority === 'high' ? '🟠 Cao' : '🔴 Khẩn cấp';
      return {
        content: `🤖 **SecureBot** - Tạo công việc thành công!\n\n🎉 **Thông tin công việc:**\n- 📋 **Tiêu đề:** ${t.title}\n- 👤 **Người thực hiện:** ${t.assignee}\n- ⚡ **Độ ưu tiên:** ${priorityStr}\n- ⚙️ **Trạng thái:** Cần làm`,
        toolCalls: [{ name: 'create_task', args: { title }, result: res.data }]
      };
    }
    return {
      content: `🤖 **SecureBot**: Không thể tạo công việc. ${res.error || 'Lỗi hệ thống'}`
    };
  }

  // Default Fallback / Greetings
  return {
    content: `Xin chào **${context.userName}**! Tôi là **SecureBot** 🤖, trợ lý ảo bảo mật của bạn tại SecureTeam.
   
Do hệ thống hiện đang chạy ở chế độ tối giản (Local Fallback), tôi sẽ hỗ trợ bạn thực hiện các thao tác thông qua danh sách lệnh nhanh sau:
   
- 👤 \`thông tin\` hoặc \`profile\`: Xem thông tin tài khoản cá nhân của bạn.
- 🟢 \`online\` hoặc \`trực tuyến\`: Xem danh sách người dùng đang online.
- 🔍 \`tìm [tên hoặc email]\`: Tìm kiếm nhân viên nhanh (Ví dụ: \`tìm Nam\`, \`tìm admin\`).
- 💬 \`kênh\` hoặc \`danh sách kênh\`: Liệt kê các kênh bạn đã tham gia.
- 📋 \`task\` hoặc \`danh sách task\`: Xem các công việc đang được gán cho bạn.
- ➕ \`tạo task [tên task]\`: Tạo một công việc mới nhanh (Ví dụ: \`tạo task Viết báo cáo\`).
   
Hãy gõ một lệnh bất kỳ ở trên để tôi hỗ trợ nhé!`
  };
}
