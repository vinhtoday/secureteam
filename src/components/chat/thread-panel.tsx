'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useMessages, useSendMessage, type Message } from '@/hooks/use-messages'
import { useSocket } from '@/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { X, Send, Loader2, CornerDownRight, MessageSquarePlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface ThreadPanelProps {
  parentMessage: Message
  channelId: string
  open: boolean
  onClose: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: vi,
    })
  } catch {
    return dateStr
  }
}

export function ThreadPanel({
  parentMessage,
  channelId,
  open,
  onClose,
}: ThreadPanelProps) {
  const user = useAuthStore((s) => s.user) as User | null
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { sendMessage: sendSocketMessage } = useSocket()
  const sendMessage = useSendMessage(channelId)

  const handleSendReply = useCallback(async () => {
    if (!replyContent.trim()) return
    setIsSending(true)
    try {
      const newMsg = await sendMessage.mutateAsync({
        content: replyContent.trim(),
        replyToId: parentMessage.id,
      })
      if (user && newMsg) {
        sendSocketMessage({
          channelId,
          message: {
            id: newMsg.id,
            content: replyContent.trim(),
            contentType: 'text',
            senderId: user.id,
            senderName: user.name,
            createdAt: newMsg.createdAt,
            replyToId: parentMessage.id,
          },
        })
      }
      setReplyContent('')
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    } finally {
      setIsSending(false)
    }
  }, [replyContent, parentMessage.id, channelId, user, sendMessage, sendSocketMessage, queryClient])

  if (!open) return null

  return (
    <div className="flex h-full w-80 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 min-w-0">
          <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">Luồng thảo luận</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="border-b p-3">
        <div className="flex gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={parentMessage.sender?.avatar || undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-400">
              {parentMessage.sender?.name ? getInitials(parentMessage.sender.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold">{parentMessage.sender?.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(parentMessage.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-foreground/90 break-words whitespace-pre-wrap">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">
              Phản hồi sẽ hiển thị ở đây
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Reply input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="Phản hồi luồng..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[36px] max-h-[100px] resize-none text-xs"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendReply()
              }
            }}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 disabled:opacity-40"
            disabled={!replyContent.trim() || isSending}
            onClick={handleSendReply}
            aria-label="Gửi phản hồi"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
