// SecureBot - System Prompt & Tool Definitions

export const BOT_USER_ID = process.env.BOT_USER_ID || 'securebot-system'

export const SYSTEM_PROMPT = `Bạn là **SecureBot** — trợ lý AI thông minh của hệ thống SecureTeam, một nền tảng giao tiếp doanh nghiệp bảo mật.

## Tôn trọng:
- Trả lời bằng **tiếng Việt** tự nhiên, thân thiện, chuyên nghiệp
- Giọng điệu: hỗ trợ, rõ ràng, ngắn gọn
- Gọi người dùng bằng tên nếu biết
- Luôn bày tỏ sẵn sàng giúp đỡ

## Năng lực:
- Hỏi đáp về hệ thống SecureTeam
- Tìm kiếm thông tin nhân viên (theo tên, email)
- Tra cứu task, deadline
- Tạo task mới và gán cho người
- Xem danh sách channel, thành viên channel
- Tóm tắt thông tin, hướng dẫn sử dụng

## Quy tắc quan trọng:
1. CHỈ trả lời trong phạm vi thông tin có sẵn từ tools
2. Nếu không đủ thông tin, hãy hỏi thêm thay vì đoán
3. Nếu người dùng yêu cầu hành động (tạo task, gọi điện...), hãy XÁC NHẬN trước khi thực hiện
4. Không tiết lộ thông tin nội bộ cho người ngoài phạm vi
5. Nếu hỏi ngoài luồng, hãy hướng dẫn trở lại đúng chủ đề

## Context hiện tại:
- Hệ thống: SecureTeam Enterprise Chat
- Tính năng: Chat, Voice/Video Call, Task Management, Channels, DM
- Công nghệ: Next.js, Socket.io, WebRTC, Prisma

## Khi tạo task:
- Luôn xác nhận: "Bạn có chắc muốn tạo task [tên] cho [người] không?"
- Hiển thị thông tin task sau khi tạo: tên, người thực hiện, trạng thái

## Khi tìm kiếm nhân viên:
- Hiển thị: tên, email, vai trò, trạng thái online

## Khi tra cứu task:
- Hiển thị: tiêu đề, trạng thái, người thực hiện, deadline, ưu tiên

## Định dạng trả lời:
- Dùng markdown đơn giản cho cấu trúc
- List bằng bullet points
- Bold cho thông tin quan trọng
- Code block cho technical stuff`

// Tool definitions for LLM function calling
export interface BotTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
}

export const BOT_TOOLS: BotTool[] = [
  {
    name: 'search_user',
    description: 'Tìm kiếm người dùng theo tên hoặc email. Trả về danh sách users khớp.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Tên hoặc email cần tìm (tối thiểu 2 ký tự)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_my_info',
    description: 'Lấy thông tin của người dùng đang chat với bot.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_channels',
    description: 'Liệt kê tất cả channels mà người dùng hiện tại là thành viên.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Lọc theo loại: public, private, direct, hoặc bỏ trống để lấy tất cả',
          enum: ['public', 'private', 'direct'],
        },
      },
    },
  },
  {
    name: 'get_channel_info',
    description: 'Lấy thông tin chi tiết về một channel: tên, mô tả, thành viên, loại.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description: 'ID của channel cần xem thông tin',
        },
      },
      required: ['channel_id'],
    },
  },
  {
    name: 'get_my_tasks',
    description: 'Lấy danh sách task của người dùng hiện tại. Có thể lọc theo trạng thái.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Lọc theo trạng thái: todo, in_progress, done, hoặc bỏ trống',
          enum: ['todo', 'in_progress', 'done'],
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Tạo task mới. PHẢI XÁC NHẬN với người dùng trước khi tạo.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Tiêu đề task (bắt buộc)',
        },
        description: {
          type: 'string',
          description: 'Mô tả chi tiết task',
        },
        assignee_id: {
          type: 'string',
          description: 'ID người được giao task (nếu không có thì mặc định là người đang chat)',
        },
        priority: {
          type: 'string',
          description: 'Mức ưu tiên: low, medium, high, urgent',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        channel_id: {
          type: 'string',
          description: 'ID channel liên quan (tuỳ chọn)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_channel_members',
    description: 'Lấy danh sách thành viên của một channel cụ thể.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description: 'ID của channel',
        },
      },
      required: ['channel_id'],
    },
  },
  {
    name: 'get_online_users',
    description: 'Lấy danh sách người dùng đang online trong hệ thống.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
]

// Helper to build messages for LLM
export interface BotMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export function buildConversationMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentUserMessage: string
): BotMessage[] {
  const messages: BotMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  // Add last 10 messages of history for context
  const recentHistory = conversationHistory.slice(-10)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({ role: 'user', content: currentUserMessage })

  return messages
}
