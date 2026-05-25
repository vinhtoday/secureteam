'use client'

import React, { memo, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './user-status-badge'
import { useAuthStore } from '@/stores/auth-store'
import type { Message } from '@/hooks/use-messages'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Reply,
  Pin,
  Trash2,
  Paperclip,
  CornerDownRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface MessageItemProps {
  message: Message
  onReply?: (message: Message) => void
  onThread?: (message: Message) => void
  onDelete?: (message: Message) => void
  isOwnMessage?: boolean
  isConsecutive?: boolean
  isSystem?: boolean
  onlineUsers?: string[]
  typingUsers?: { userId: string; channelId: string }[]
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MessageItem = memo(
  forwardRef<HTMLDivElement, MessageItemProps>(
    function MessageItem(
      {
        message,
        onReply,
        onThread,
        onDelete,
        isOwnMessage,
        isConsecutive,
        isSystem,
        onlineUsers,
      },
      ref
    ) {
      const user = useAuthStore((s) => s.user)

      if (isSystem || message.contentType === 'system') {
        return (
          <div ref={ref} className="flex justify-center py-2">
            <div className="rounded-full bg-muted px-4 py-1 text-xs text-muted-foreground">
              {message.content}
            </div>
          </div>
        )
      }

      const isOnline = onlineUsers?.includes(message.senderId || '')
      const showAvatar = !isConsecutive
      const senderName = message.sender?.name || 'Người dùng'
      const isOwn = isOwnMessage || message.senderId === user?.id

      return (
        <div
          ref={ref}
          className={cn(
            'group relative flex gap-3 px-4 py-1 hover:bg-muted/30',
            isConsecutive && 'pt-0.5'
          )}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {showAvatar ? (
              <UserAvatar
                name={senderName}
                avatar={message.sender?.avatar}
                status={isOnline ? 'online' : 'offline'}
                size="md"
              />
            ) : (
              <div className="w-9" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {showAvatar && (
              <div className="mb-1 flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isOwn
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground'
                  )}
                >
                  {senderName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
                {message.isPinned && (
                  <Pin className="h-3 w-3 text-amber-500" />
                )}
                {message.isEdited && (
                  <span className="text-[10px] text-muted-foreground italic">
                    (đã chỉnh sửa)
                  </span>
                )}
              </div>
            )}

            {/* Reply reference */}
            {message.replyTo && (
              <div className="mb-1 ml-1 rounded-md border-l-2 border-emerald-500 bg-muted/50 px-2 py-1 text-xs">
                <div className="font-medium text-muted-foreground">
                  {message.replyTo.sender?.name}
                </div>
                <div className="truncate text-muted-foreground/80">
                  {message.replyTo.content?.substring(0, 80) || '(tệp đính kèm)'}
                </div>
              </div>
            )}

            {/* Message body */}
            <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </div>

            {/* File attachment */}
            {message.fileUrl && (
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{message.fileName || 'Tệp đính kèm'}</div>
                  {message.fileSize && (
                    <div className="text-muted-foreground">
                      {formatFileSize(message.fileSize)}
                    </div>
                  )}
                </div>
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700 transition-colors"
                >
                  Tải xuống
                </a>
              </div>
            )}

            {/* Reply count indicator */}
            {message.replies && message.replies.length > 0 && (
              <button
                onClick={() => onThread?.(message)}
                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CornerDownRight className="h-3 w-3" />
                {message.replies.length} phản hồi
              </button>
            )}

            {/* Hover actions */}
            {!isSystem && (
              <div className="absolute -top-2 right-4 hidden items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onReply?.(message)}
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Phản hồi</TooltipContent>
                </Tooltip>
                {(isOwn || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete?.(message)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xóa</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }
  )
)
