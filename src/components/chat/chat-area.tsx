'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useMessages, useSendMessage, type Message } from '@/hooks/use-messages'
import { useSocket } from '@/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import { MessageItem } from './message-item'
import { MessageInput } from './message-input'
import { ChannelHeader } from './channel-header'
import { MemberList } from './member-list'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, MessageSquarePlus, MessagesSquare, Sparkles } from 'lucide-react'
import type { ChannelDetail } from '@/hooks/use-channels'

interface ChatAreaProps {
  channel: ChannelDetail | null
  onlineUsers: string[]
}

export function ChatArea({
  channel,
  onlineUsers,
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

  // Messages list
  const messages = messagesPages?.pages.flat() || []
  const allMessages = [...messages].reverse()

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
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

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    },
    [channelId, user, sendMessage, sendSocketMessage]
  )

  const handleDelete = useCallback(
    async (message: Message) => {
      if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
        try {
          await fetch(`/api/v1/channels/${channelId}/messages/${message.id}`, {
            method: 'DELETE',
          })
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

  // No channel selected
  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center max-w-sm px-6">
          <div className="relative inline-flex mx-auto mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 shadow-lg shadow-emerald-500/10">
              <MessagesSquare className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Chào mừng đến SecureTeam
          </h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Chọn một kênh từ danh sách hoặc tạo kênh mới để bắt đầu trò chuyện với đồng nghiệp
          </p>
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

          <MessageInput
            onSend={handleSend}
            onTyping={() => channelId && sendTyping(channelId)}
            onStopTyping={() => channelId && sendStopTyping(channelId)}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            disabled={sendMessage.isPending}
            typingUsers={channelTypingUsers.map((t) => ({
              userId: t.userId,
              name: t.userId,
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
