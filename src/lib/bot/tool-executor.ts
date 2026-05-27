// SecureBot - Tool Executor
// Executes tool calls from the LLM agent

import { db } from '@/lib/db'

interface ToolContext {
  userId: string
  channelId?: string
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'search_user':
        return await searchUser(args, context)
      case 'get_my_info':
        return await getMyInfo(context)
      case 'list_channels':
        return await listChannels(args, context)
      case 'get_channel_info':
        return await getChannelInfo(args, context)
      case 'get_my_tasks':
        return await getMyTasks(args, context)
      case 'create_task':
        return await createTask(args, context)
      case 'get_channel_members':
        return await getChannelMembers(args, context)
      case 'get_online_users':
        return await getOnlineUsers(args, context)
      default:
        return { success: false, error: `Tool "${toolName}" không tồn tại` }
    }
  } catch (error) {
    console.error(`[SecureBot] Tool ${toolName} error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi khi thực thi tool',
    }
  }
}

async function searchUser(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
  const query = (args.query as string || '').trim()
  if (query.length < 2) {
    return { success: false, error: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự' }
  }

  const users = await db.user.findMany({
    where: {
      isBot: false,
      isActive: true,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      onlineStatus: true,
      role: { select: { name: true, description: true } },
    },
    take: 10,
  })

  if (users.length === 0) {
    return { success: true, data: { message: `Không tìm thấy người dùng nào khớp "${query}"`, users: [] } }
  }

  return {
    success: true,
    data: {
      message: `Tìm thấy ${users.length} người dùng:`,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        online: u.onlineStatus === 'online',
        role: u.role.name,
      })),
    },
  }
}

async function getMyInfo(context: ToolContext): Promise<ToolResult> {
  const user = await db.user.findUnique({
    where: { id: context.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      onlineStatus: true,
      isEmailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      role: { select: { name: true, description: true } },
      _count: {
        select: {
          memberships: true,
          messages: true,
        },
      },
    },
  })

  if (!user) {
    return { success: false, error: 'Không tìm thấy thông tin người dùng' }
  }

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      online: user.onlineStatus === 'online',
      role: user.role.name,
      channelCount: user._count.memberships,
      messageCount: user._count.messages,
      twoFactorEnabled: user.twoFactorEnabled,
      joinedAt: user.createdAt,
    },
  }
}

async function listChannels(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const type = args.type as string | undefined

  const where: Record<string, unknown> = {
    members: { some: { userId: context.userId } },
    isArchived: false,
  }

  if (type && ['public', 'private', 'direct'].includes(type)) {
    where.type = type
  }

  const channels = await db.channel.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  return {
    success: true,
    data: {
      message: `Bạn có ${channels.length} kênh:`,
      channels: channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        type: ch.type,
        memberCount: ch._count.members,
        messageCount: ch._count.messages,
      })),
    },
  }
}

async function getChannelInfo(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const channelId = args.channel_id as string
  if (!channelId) {
    return { success: false, error: 'channel_id là bắt buộc' }
  }

  // Check membership
  const membership = await db.channelMember.findUnique({
    where: { userId_channelId: { userId: context.userId, channelId } },
  })
  if (!membership) {
    return { success: false, error: 'Bạn không phải thành viên của kênh này' }
  }

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isArchived: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
      _count: { select: { members: true, messages: true } },
    },
  })

  if (!channel) {
    return { success: false, error: 'Kênh không tồn tại' }
  }

  return {
    success: true,
    data: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      isArchived: channel.isArchived,
      owner: channel.owner?.name,
      memberCount: channel._count.members,
      messageCount: channel._count.messages,
      createdAt: channel.createdAt,
    },
  }
}

async function getMyTasks(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const status = args.status as string | undefined

  try {
    const where: Record<string, unknown> = { assignees: { some: { userId: context.userId } } }
    if (status && ['todo', 'in_progress', 'review', 'done', 'cancelled'].includes(status)) {
      where.status = status
    }
    where.isArchived = false

    const tasks = await db.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        progress: true,
        dueDate: true,
        createdAt: true,
        _count: {
          select: { assignees: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return {
      success: true,
      data: {
        message: tasks.length > 0 ? `Bạn có ${tasks.length} task:` : 'Bạn không có task nào',
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          progress: t.progress,
          dueDate: t.dueDate,
          assigneeCount: t._count.assignees,
          createdAt: t.createdAt,
        })),
      },
    }
  } catch {
    return {
      success: true,
      data: { message: 'Tính năng Task Management chưa được thiết lập trong hệ thống.' },
    }
  }
}

async function createTask(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const title = (args.title as string || '').trim()
  if (!title) {
    return { success: false, error: 'Tiêu đề task là bắt buộc' }
  }

  try {
    const assigneeId = (args.assignee_id as string) || context.userId
    const priority = (args.priority as string) || 'medium'
    const description = (args.description as string) || ''

    // Validate assignee exists
    const assignee = await db.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, name: true },
    })

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: 'todo',
        priority,
        createdBy: context.userId,
        assignees: {
          create: {
            userId: assigneeId,
            assignedBy: context.userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    })

    // Create activity log
    await db.taskActivity.create({
      data: {
        taskId: task.id,
        userId: context.userId,
        action: 'created',
        newValue: JSON.stringify({ title, status: 'todo', priority }),
      },
    })

    return {
      success: true,
      data: {
        message: `Đã tạo task thành công!`,
        task: {
          id: task.id,
          title,
          description,
          status: 'todo',
          priority,
          assignee: assignee?.name || 'Không xác định',
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'Không thể tạo task. Tính năng Task Management chưa sẵn sàng.',
    }
  }
}

async function getChannelMembers(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const channelId = args.channel_id as string
  if (!channelId) {
    return { success: false, error: 'channel_id là bắt buộc' }
  }

  // Check membership
  const membership = await db.channelMember.findUnique({
    where: { userId_channelId: { userId: context.userId, channelId } },
  })
  if (!membership) {
    return { success: false, error: 'Bạn không phải thành viên của kênh này' }
  }

  const members = await db.channelMember.findMany({
    where: { channelId },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          onlineStatus: true,
          avatar: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return {
    success: true,
    data: {
      message: `Kênh có ${members.length} thành viên:`,
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        online: m.user.onlineStatus === 'online',
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    },
  }
}

async function getOnlineUsers(_args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
  const onlineUsers = await db.user.findMany({
    where: {
      isBot: false,
      isActive: true,
      onlineStatus: 'online',
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: { select: { name: true } },
    },
    take: 50,
  })

  return {
    success: true,
    data: {
      message: `Hiện có ${onlineUsers.length} người đang online:`,
      users: onlineUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.name,
      })),
    },
  }
}
