'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
import { AlertCircle, MessageSquarePlus } from 'lucide-react'
import type { Channel } from '@/hooks/use-channels'

interface ChatAreaProps {
  channel: Channel | null
  onlineUsers: string[]
  onToggleSidebar?: () => void
  isMobile?: boolean
}

export function ChatArea({
  channel,
  onlineUsers,
  onToggleSidebar,
  isMobile,
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
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center">
          <MessageSquarePlus className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">
            Chọn một kênh
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Chọn kênh từ danh sách hoặc tạo kênh mới để bắt đầu trò chuyện
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChannelHeader
        channel={channel}
        onToggleMembers={() => setShowMembers(!showMembers)}
        onToggleSidebar={onToggleSidebar}
        isMobile={isMobile}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Không thể tải tin nhắn
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
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
              <div className="text-center">
                <MessageSquarePlus className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Chưa có tin nhắn nào
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Hãy bắt đầu cuộc trò chuyện!
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto"
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
                      className="text-xs"
                    >
                      Tải thêm tin nhắn
                    </Button>
                  )}
                </div>
              )}

              <div className="py-4">
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
            onTyping={() => sendTyping(channelId)}
            onStopTyping={() => sendStopTyping(channelId)}
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
