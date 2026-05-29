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
import { AlertCircle, MessageSquarePlus, MessagesSquare, Sparkles, Bot, User as UserIcon, ArrowRight, Shield, ListTodo, UserCheck } from 'lucide-react'
import type { ChannelDetail } from '@/hooks/use-channels'
import { api } from '@/lib/api'

const isDifferentDay = (aStr: string, bStr: string) => {
  try {
    const a = new Date(aStr)
    const b = new Date(bStr)
    return a.toDateString() !== b.toDateString()
  } catch {
    return false
  }
}

const formatDateSeparator = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

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
      <div className="flex-1 overflow-y-auto bg-[#080b0e] bg-tactical-grid relative p-6 md:p-10 flex flex-col justify-center items-center">
        <div className="relative z-10 max-w-4xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Operational Status */}
          <div className="border border-[#1e2d3d] bg-[#111820] p-4 flex flex-col items-center gap-1.5 relative rounded-[8px]">
            <span className="text-[10px] font-mono-jb font-bold text-[#4d6b80] tracking-[3px]">
              // SECURE COMM-LINK TERMINAL
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d68f] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d68f]"></span>
              </span>
              <span className="text-[11px] font-mono-jb font-extrabold tracking-widest text-[#00d68f] animate-online-glow">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>

          <div className="text-center space-y-2 py-2">
            <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-widest text-[#dce8f0] uppercase">
              AGENT ACCESS VERIFIED
            </h1>
            <p className="text-[11px] font-mono-jb text-[#4d6b80] max-w-lg mx-auto uppercase tracking-wider leading-relaxed">
              WELCOME BACK AGENT. YOUR SESSION IS SECURED. SELECT AN OPERATIONS CHANNEL OR DIRECT TRANSMISSION PROTOCOL TO PROCEED.
            </p>
          </div>

          {/* Main Dashboard Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Profile Info Card */}
            <div className="bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-5 flex flex-col justify-between relative">
              <div className="space-y-4">
                <span className="text-[9px] font-mono-jb font-bold uppercase tracking-wider text-[#00d68f] bg-[#00d68f]/14 border border-[#00d68f]/25 px-2.5 py-1 rounded-[4px]">
                  AGENT CREDENTIALS
                </span>
                <div className="flex items-center gap-4 pt-2">
                  <div className="h-12 w-12 rounded-full bg-[#0d1117] border border-[#1e2d3d] flex items-center justify-center text-[#00d68f] text-sm font-rajdhani font-bold">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-rajdhani font-bold text-[#dce8f0] text-sm uppercase tracking-wider truncate">{user?.name}</h3>
                    <p className="text-[10px] font-mono-jb text-[#4d6b80] truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[9px] font-mono-jb px-2 py-0.5 font-bold bg-[#0d1117] text-[#00d68f] border border-[#1e2d3d] uppercase rounded-[4px]">
                      ROLE: {user?.role?.name || 'MEMBER'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-[#1e2d3d] mt-6 flex items-center justify-between text-[10px] font-mono-jb text-[#4d6b80]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00d68f] animate-online-glow" />
                  {onlineUsers.length} AGENTS ACTIVE
                </span>
                <span>SECURE TRACE</span>
              </div>
            </div>

            {/* AI Assistant Quick Commands Widget */}
            <div className="bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-5 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4.5 w-4.5 text-[#00d68f]" />
                  <span className="text-xs font-rajdhani font-bold text-[#dce8f0] uppercase tracking-wider">SECUREBOT CONSOLE</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono-jb text-[#00d68f] font-bold bg-[#00d68f]/14 px-2 py-0.5 border border-[#00d68f]/25 rounded-[4px]">
                  SYS ACTIVE
                </span>
              </div>
              <p className="text-[10px] font-mono-jb text-[#4d6b80] leading-normal uppercase">
                EXECUTE AUTO DIRECTIVES TO CHAT WITH COMMAND BOT:
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleOpenBotDM('thông tin')}
                  className="flex items-center justify-between border border-[#1e2d3d] bg-[#0d1117] hover:border-[#00d68f] hover:bg-[#00d68f]/5 p-2.5 text-left transition-all group cursor-pointer rounded-[6px]"
                >
                  <span className="text-[9px] font-mono-jb font-bold text-[#dce8f0] uppercase group-hover:text-[#00d68f]">// SYS_INFO</span>
                  <ArrowRight className="h-3 w-3 text-[#4d6b80] group-hover:text-[#00d68f] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('online')}
                  className="flex items-center justify-between border border-[#1e2d3d] bg-[#0d1117] hover:border-[#00d68f] hover:bg-[#00d68f]/5 p-2.5 text-left transition-all group cursor-pointer rounded-[6px]"
                >
                  <span className="text-[9px] font-mono-jb font-bold text-[#dce8f0] uppercase group-hover:text-[#00d68f]">// ACTIVE_AGENTS</span>
                  <ArrowRight className="h-3 w-3 text-[#4d6b80] group-hover:text-[#00d68f] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('task')}
                  className="flex items-center justify-between border border-[#1e2d3d] bg-[#0d1117] hover:border-[#00d68f] hover:bg-[#00d68f]/5 p-2.5 text-left transition-all group cursor-pointer rounded-[6px]"
                >
                  <span className="text-[9px] font-mono-jb font-bold text-[#dce8f0] uppercase group-hover:text-[#00d68f]">// LIST_TASKS</span>
                  <ArrowRight className="h-3 w-3 text-[#4d6b80] group-hover:text-[#00d68f] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('tìm ')}
                  className="flex items-center justify-between border border-[#1e2d3d] bg-[#0d1117] hover:border-[#00d68f] hover:bg-[#00d68f]/5 p-2.5 text-left transition-all group cursor-pointer rounded-[6px]"
                >
                  <span className="text-[9px] font-mono-jb font-bold text-[#dce8f0] uppercase group-hover:text-[#00d68f]">// SEARCH_AGENT</span>
                  <ArrowRight className="h-3 w-3 text-[#4d6b80] group-hover:text-[#00d68f] transition-colors" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer signature */}
          <div className="text-center pt-8 text-[9px] font-mono-jb text-[#4d6b80]/40 select-none uppercase tracking-wider">
            SECURETEAM TRANSMISSION HUB // DEPLOYED v2.0
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#080b0e]">
      <ChannelHeader
        channel={channel}
        channelMembers={channel.members}
        onToggleMembers={() => setShowMembers(!showMembers)}
        onSelectChannel={onSelectChannel}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 p-4 space-y-6 bg-[#080b0e]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}>
                  <Skeleton className="h-8 w-8 rounded-full bg-[#111820] shrink-0 border border-[#1e2d3d]" />
                  <div className={cn('space-y-2 max-w-[60%]', i % 2 === 0 ? 'items-start' : 'items-end')}>
                    <Skeleton className="h-5 w-40 rounded-[6px] bg-[#111820] border border-[#1e2d3d]" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center bg-[#080b0e]">
              <div className="text-center max-w-xs px-6 border border-destructive/30 bg-[#111820] p-6 rounded-[8px] relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-destructive/10 rounded-full border border-destructive/20">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-xs font-rajdhani font-bold text-[#dce8f0] uppercase tracking-wider">
                  // TRANSMISSION ERROR
                </p>
                <p className="mt-2 text-[10px] font-mono-jb text-[#4d6b80] uppercase leading-relaxed">
                  FAILED TO RETRIEVE MESSAGE METRIC. RE-ESTABLISH HANDSHAKE.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-[6px] border-[#1e2d3d] hover:bg-[#161f2a] hover:text-[#00d68f] text-xs font-rajdhani uppercase cursor-pointer"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
                  }}
                >
                  RECONNECT
                </Button>
              </div>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center bg-[#080b0e] font-mono-jb text-xs text-[#4d6b80]/60 uppercase">
              // NO TRANSMISSION RECORDS IN THIS CHANNEL
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-2 bg-[#080b0e]"
            >
              {hasPreviousPage && (
                <div className="flex justify-center py-2">
                  {isFetchingPreviousPage ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00d68f] border-t-transparent" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      className="text-[10px] font-rajdhani font-bold tracking-wider uppercase rounded-[6px] border border-[#1e2d3d] bg-[#111820] text-[#dce8f0] hover:bg-[#161f2a] cursor-pointer"
                    >
                      LOAD PREVIOUS TRANSMISSIONS
                    </Button>
                  )}
                </div>
              )}

              <div className="py-2">
                {allMessages.map((message, index) => {
                  const showDateSeparator = index === 0 || isDifferentDay(allMessages[index - 1].createdAt, message.createdAt);
                  return (
                    <React.Fragment key={message.id}>
                      {showDateSeparator && (
                        <div className="flex items-center my-4">
                          <div className="flex-1 border-t border-[#1e2d3d]" />
                          <span className="px-3 font-mono-jb text-[9px] text-[#4d6b80] uppercase tracking-wider">
                            {formatDateSeparator(message.createdAt)}
                          </span>
                          <div className="flex-1 border-t border-[#1e2d3d]" />
                        </div>
                      )}
                      <MessageItem
                        message={message}
                        isOwnMessage={message.senderId === user?.id}
                        isConsecutive={
                          !showDateSeparator &&
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
                    </React.Fragment>
                  );
                })}
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
            placeholder={isBotChannel ? 'TRANSMIT DIRECTIVE TO SECUREBOT...' : undefined}
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

