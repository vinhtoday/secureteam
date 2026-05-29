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
      <div className="flex-1 overflow-y-auto bg-[#0a0c0f] bg-tactical-grid relative p-6 md:p-10 flex flex-col justify-center items-center">
        <div className="relative z-10 max-w-4xl w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Operational Status */}
          <div className="border border-[#1e2a35] bg-[#0f1318] p-4 flex flex-col items-center gap-1.5 relative corner-bracket">
            <span className="text-[10px] font-mono font-bold text-muted-foreground/50 tracking-[3px]">
              // SECURE COMM-LINK TERMINAL
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e5a0] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e5a0]"></span>
              </span>
              <span className="text-[11px] font-mono font-extrabold tracking-widest text-[#00e5a0] animate-online-glow">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>

          <div className="text-center space-y-2 py-2">
            <h1 className="text-2xl md:text-3xl font-title font-extrabold tracking-widest text-white uppercase">
              AGENT ACCESS VERIFIED
            </h1>
            <p className="text-[11px] font-mono text-muted-foreground/80 max-w-lg mx-auto uppercase tracking-wider leading-relaxed">
              WELCOME BACK AGENT. YOUR SESSION IS SECURED. SELECT AN OPERATIONS CHANNEL OR DIRECT TRANSMISSION PROTOCOL TO PROCEED.
            </p>
          </div>

          {/* Main Dashboard Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Profile Info Card */}
            <div className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-5 flex flex-col justify-between relative corner-bracket">
              <div className="space-y-4">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#00e5a0] bg-[#00e5a0]/8 border border-[#00e5a0]/25 px-2.5 py-1">
                  AGENT CREDENTIALS
                </span>
                <div className="flex items-center gap-4 pt-2">
                  <div className="h-12 w-12 bg-[#0a0c0f] border border-[#1e2a35] flex items-center justify-center text-[#00e5a0] text-sm font-mono font-bold">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-mono font-bold text-white text-sm uppercase tracking-wider truncate">{user?.name}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[9px] font-mono px-2 py-0.5 font-bold bg-[#1e2a35] text-[#00e5a0] border border-[#1e2a35] uppercase">
                      ROLE: {user?.role?.name || 'MEMBER'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-[#1e2a35] mt-6 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-[#00e5a0] animate-online-glow" />
                  {onlineUsers.length} AGENTS ACTIVE
                </span>
                <span>SECURE TRACE</span>
              </div>
            </div>

            {/* AI Assistant Quick Commands Widget */}
            <div className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-5 space-y-4 relative corner-bracket">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4.5 w-4.5 text-[#00e5a0]" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">SECUREBOT CONSOLE</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono text-[#00e5a0] font-bold bg-[#00e5a0]/8 px-2 py-0.5 border border-[#00e5a0]/25">
                  SYS ACTIVE
                </span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-normal uppercase">
                EXECUTE AUTO DIRECTIVES TO CHAT WITH COMMAND BOT:
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleOpenBotDM('thông tin')}
                  className="flex items-center justify-between border border-[#1e2a35] bg-[#0a0c0f] hover:border-[#00e5a0] hover:bg-[#00e5a0]/5 p-2.5 text-left transition-all group cursor-pointer"
                >
                  <span className="text-[9px] font-mono font-bold text-white uppercase group-hover:text-[#00e5a0]">// SYS_INFO</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-[#00e5a0] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('online')}
                  className="flex items-center justify-between border border-[#1e2a35] bg-[#0a0c0f] hover:border-[#00e5a0] hover:bg-[#00e5a0]/5 p-2.5 text-left transition-all group cursor-pointer"
                >
                  <span className="text-[9px] font-mono font-bold text-white uppercase group-hover:text-[#00e5a0]">// ACTIVE_AGENTS</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-[#00e5a0] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('task')}
                  className="flex items-center justify-between border border-[#1e2a35] bg-[#0a0c0f] hover:border-[#00e5a0] hover:bg-[#00e5a0]/5 p-2.5 text-left transition-all group cursor-pointer"
                >
                  <span className="text-[9px] font-mono font-bold text-white uppercase group-hover:text-[#00e5a0]">// LIST_TASKS</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-[#00e5a0] transition-colors" />
                </button>

                <button
                  onClick={() => handleOpenBotDM('tìm ')}
                  className="flex items-center justify-between border border-[#1e2a35] bg-[#0a0c0f] hover:border-[#00e5a0] hover:bg-[#00e5a0]/5 p-2.5 text-left transition-all group cursor-pointer"
                >
                  <span className="text-[9px] font-mono font-bold text-white uppercase group-hover:text-[#00e5a0]">// SEARCH_AGENT</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-[#00e5a0] transition-colors" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer signature */}
          <div className="text-center pt-8 text-[9px] font-mono text-muted-foreground/30 select-none uppercase tracking-wider">
            SECURETEAM TRANSMISSION HUB // DEPLOYED v2.0
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0a0c0f]">
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
                  <Skeleton className="h-8 w-8 rounded-none bg-[#1e2a35] shrink-0" />
                  <div className={cn('space-y-2 max-w-[60%]', i % 2 === 0 ? 'items-start' : 'items-end')}>
                    <Skeleton className="h-5 w-40 rounded-none bg-[#1e2a35]" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-xs px-6 border border-destructive/30 bg-[#0f1318] p-6 rounded-none relative corner-bracket">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-destructive/10">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  // TRANSMISSION ERROR
                </p>
                <p className="mt-2 text-[10px] font-mono text-muted-foreground uppercase leading-relaxed">
                  FAILED TO RETRIEVE MESSAGE METRIC. RE-ESTABLISH HANDSHAKE.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-none border-[#1e2a35] hover:bg-[#1e2a35] hover:text-[#00e5a0] text-xs font-mono uppercase cursor-pointer"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
                  }}
                >
                  RECONNECT
                </Button>
              </div>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground/60 uppercase">
              // NO TRANSMISSION RECORDS IN THIS CHANNEL
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
                    <div className="h-6 w-6 animate-spin rounded-none border-2 border-[#00e5a0] border-t-transparent" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      className="text-[10px] font-mono font-bold tracking-wider uppercase rounded-none border border-[#1e2a35] text-white hover:bg-[#1e2a35] cursor-pointer"
                    >
                      LOAD PREVIOUS TRANSMISSIONS
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

