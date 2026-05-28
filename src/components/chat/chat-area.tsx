'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useMessages, useSendMessage, type Message } from '@/hooks/use-messages'
import { useSocket } from '@/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import { useBot } from '@/hooks/use-bot'
import { MessageItem } from './message-item'
import { MessageInput } from './message-input'
import { ChannelHeader } from './channel-header'
import { MemberList } from './member-list'
import { BotTypingIndicator } from './bot-typing-indicator'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, MessageSquarePlus, MessagesSquare, Sparkles, Bot, User, ArrowRight, Shield, ListTodo, UserCheck } from 'lucide-react'
import type { ChannelDetail } from '@/hooks/use-channels'
import { api } from '@/lib/api'

interface ChatAreaProps {
  channel: ChannelDetail | null
  onlineUsers: string[]
  onSelectChannel?: (channelId: string | null) => void
}

export function ChatArea({
  channel,
  onlineUsers,
  onSelectChannel,
}: ChatAreaProps) {
  const user = useAuthStore((s) => s.user) as User | null
  const queryClient = useQueryClient()
  const [showMembers, setShowMembers] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const {
    joinChannel,
    leaveChannel,
    sendMessage: sendSocketMessage,
    sendTyping,
    sendStopTyping,
    onNewMessage,
    typingUsers,
  } = useSocket()

  const channelId = channel?.id || null

  // SecureBot integration
  const isBotChannel = useMemo(() => {
    if (!channel || !user) return false
    if (channel.type !== 'direct') return false
    const otherMember = channel.members?.find((m) => m.userId !== user.id)
    return otherMember?.user?.isBot === true || otherMember?.userId === 'securebot-system'
  }, [channel, user])

  const { isThinking: botIsThinking, shouldTriggerBot, chatWithBot } = useBot(channelId)

  const {
    data: messagesPages,
    fetchNextPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading,
    isError,
  } = useMessages(channelId)

  const sendMessage = useSendMessage(channelId || '')

  // Join/leave channel
  useEffect(() => {
    if (channelId) {
      joinChannel(channelId)
      return () => {
        leaveChannel(channelId)
      }
    }
  }, [channelId, joinChannel, leaveChannel])

  // Listen for new messages via socket
  useEffect(() => {
    if (!channelId) return
    const cleanup = onNewMessage((data: { channelId: string }) => {
      if (data.channelId === channelId) {
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
      }
    })
    return cleanup
  }, [channelId, onNewMessage, queryClient])

  // Messages list chronologically sorted (oldest first -> top to bottom)
  const allMessages = useMemo(() => {
    const msgs = messagesPages?.pages.flat() || []
    return [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [messagesPages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (allMessages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messagesPages?.pages.length])

  // Scroll to bottom on channel switch
  useEffect(() => {
    if (channelId) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [channelId])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      if (target.scrollTop === 0 && hasPreviousPage && !isFetchingPreviousPage) {
        fetchNextPage()
      }
    },
    [hasPreviousPage, isFetchingPreviousPage, fetchNextPage]
  )

  const handleSend = useCallback(
    async (content: string, contentType?: string, replyToId?: string) => {
      if (!channelId) return

      const newMsg = await sendMessage.mutateAsync({
        content,
        contentType,
        replyToId,
      })

      // Broadcast via socket
      if (user && newMsg) {
        sendSocketMessage({
          channelId,
          message: {
            id: newMsg.id,
            content,
            contentType: contentType || 'text',
            senderId: user.id,
            senderName: user.name,
            createdAt: newMsg.createdAt,
            replyToId,
          },
        })
      }

      setReplyTo(null)

      // Check if SecureBot should respond
      const triggerBot = shouldTriggerBot(content, isBotChannel)
      if (triggerBot && channelId) {
        // Clean @SecureBot mention from message content for bot processing
        const cleanContent = content
          .replace(/@SecureBot\s*/gi, '')
          .replace(/@Secure_Bot\s*/gi, '')
          .trim()
        if (cleanContent) {
          chatWithBot(cleanContent)
        }
      }

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    },
    [channelId, user, sendMessage, sendSocketMessage, shouldTriggerBot, chatWithBot, isBotChannel]
  )

  // Auto-run bot quick commands from Welcome Dashboard
  useEffect(() => {
    if (channelId && isBotChannel && typeof window !== 'undefined') {
      const autoCommand = window.sessionStorage.getItem('bot_auto_command')
      if (autoCommand) {
        window.sessionStorage.removeItem('bot_auto_command')
        // Automatically send the quick action command
        setTimeout(() => {
          handleSend(autoCommand, 'text')
        }, 300)
      }
    }
  }, [channelId, isBotChannel, handleSend])

  const handleDelete = useCallback(
    async (message: Message, mode: 'recall' | 'me') => {
      const confirmMsg =
        mode === 'recall'
          ? 'Bạn có chắc muốn thu hồi tin nhắn này đối với mọi người?'
          : 'Bạn có chắc muốn xóa tin nhắn này ở phía bạn?'
      if (confirm(confirmMsg)) {
        try {
          const { api } = await import('@/lib/api')
          await api.delete(`/api/v1/channels/${channelId}/messages/${message.id}?mode=${mode}`)
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
        } catch {
          // Silent fail
        }
      }
    },
    [channelId, queryClient]
  )

  const channelTypingUsers = typingUsers.filter(
    (t) => t.channelId === channelId && t.userId !== user?.id
  )

  // No channel selected (Workspace Welcome Dashboard & SecureBot Hub)
  if (!channel) {
    const handleOpenBotDM = async (autoCommand?: string) => {
      try {
        const res = await api.post('/api/v1/channels/direct', { userId: 'securebot-system' })
        const dmChannel = res.data as { id: string }
        queryClient.invalidateQueries({ queryKey: ['channels'] })
        if (autoCommand && typeof window !== 'undefined') {
          window.sessionStorage.setItem('bot_auto_command', autoCommand)
        }
        if (onSelectChannel) {
          onSelectChannel(dmChannel.id)
        }
      } catch (error) {
        console.error('Failed to open bot channel:', error)
      }
    }

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background via-violet-500/5 to-background relative p-6 md:p-10 flex flex-col justify-center items-center">
        {/* Animated backdrop glow balls */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-violet-400/10 blur-3xl animate-pulse duration-[6000ms]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl animate-pulse duration-[8000ms]" />
        </div>

        <div className="relative z-10 max-w-4xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Header section */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
              Chào mừng trở lại, {user?.name || 'Thành viên'}!
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              Bạn đang ở trong không gian làm việc bảo mật của **SecureTeam**. Hãy chọn một kênh hoặc bắt đầu trò chuyện với AI Assistant của chúng tôi.
            </p>
          </div>

          {/* Main Dashboard Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Profile Info Card */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40 px-2.5 py-1 rounded-full">
                  Thành viên hệ thống
                </span>
                <div className="flex items-center gap-4 pt-2">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 text-lg font-bold border border-violet-200/50 dark:border-violet-800/30 shadow-sm">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-lg truncate">{user?.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border/40">
                      {user?.role?.name || 'MEMBER'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-border/40 mt-6 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineUsers.length} thành viên đang trực tuyến
                </span>
                <span>Kết nối mã hóa AES-256</span>
              </div>
            </div>

            {/* AI Assistant Quick Commands Widget (SecureBot Hub) */}
            <div className="glass-card rounded-2xl p-6 space-y-4 hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-bold text-foreground">SecureBot AI Assistant</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-250/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ONLINE
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Nhấp chuột vào các phím tắt lệnh nhanh dưới đây để mở trò chuyện và chạy lệnh tự động với trợ lý ảo:
              </p>
              
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => handleOpenBotDM('thông tin')}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 p-3 text-left transition-all hover:border-violet-300 dark:hover:border-violet-800 group"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-foreground/80">Hồ sơ cá nhân</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('online')}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 p-3 text-left transition-all hover:border-violet-300 dark:hover:border-violet-800 group"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-foreground/80">Xem ai online</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('task')}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 p-3 text-left transition-all hover:border-violet-300 dark:hover:border-violet-800 group"
                >
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-foreground/80">Việc được giao</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('tìm ')}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 p-3 text-left transition-all hover:border-violet-300 dark:hover:border-violet-800 group"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-foreground/80">Tìm nhân viên</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer signature */}
          <div className="text-center pt-8 text-xs text-muted-foreground/35 select-none font-medium">
            SecureTeam Platform • Developed with ❤️ by vinhtoday
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChannelHeader
        channel={channel}
        channelMembers={channel.members}
        onToggleMembers={() => setShowMembers(!showMembers)}
        onSelectChannel={onSelectChannel}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 p-4 space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}>
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className={cn('space-y-2 max-w-[60%]', i % 2 === 0 ? 'items-start' : 'items-end')}>
                    <Skeleton className="h-5 w-40 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-xs px-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Không thể tải tin nhắn
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Đã xảy ra lỗi khi tải tin nhắn. Vui lòng thử lại.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-lg"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
                  }}
                >
                  Thử lại
                </Button>
              </div>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-xs px-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80">
                  <MessageSquarePlus className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chưa có tin nhắn nào
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Hãy bắt đầu cuộc trò chuyện!
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-2"
            >
              {hasPreviousPage && (
                <div className="flex justify-center py-2">
                  {isFetchingPreviousPage ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      className="text-xs rounded-lg"
                    >
                      Tải thêm tin nhắn
                    </Button>
                  )}
                </div>
              )}

              <div className="py-2">
                {allMessages.map((message, index) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderId === user?.id}
                    isConsecutive={
                      index > 0 &&
                      allMessages[index - 1].senderId === message.senderId &&
                      new Date(message.createdAt).getTime() -
                        new Date(allMessages[index - 1].createdAt).getTime() <
                        300000
                    }
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    onlineUsers={onlineUsers}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bot typing indicator */}
          {botIsThinking && <BotTypingIndicator />}

          <MessageInput
            onSend={handleSend}
            onTyping={() => channelId && sendTyping(channelId)}
            onStopTyping={() => channelId && sendStopTyping(channelId)}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            disabled={sendMessage.isPending || botIsThinking}
            placeholder={isBotChannel ? 'Nhập tin nhắn cho SecureBot...' : undefined}
            typingUsers={channelTypingUsers.map((t) => ({
              userId: t.userId,
              name: t.userName,
            }))}
          />
        </div>

        {showMembers && (
          <MemberList
            channelId={channelId}
            open={showMembers}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>
    </div>
  )
}
