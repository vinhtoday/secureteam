'use client'

import React, { memo, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './user-status-badge'
import { useAuthStore } from '@/stores/auth-store'
import type { Message } from '@/hooks/use-messages'
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
  Bot,
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
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

function formatRelativeTime(dateStr: string) {
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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
          <div ref={ref} className="flex justify-center py-3 px-4">
            <div className="rounded-full bg-muted/80 px-4 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
              {message.content}
            </div>
          </div>
        )
      }

      const isOnline = onlineUsers?.includes(message.senderId || '')
      const showAvatar = !isConsecutive
      const senderName = message.sender?.name || 'Người dùng'
      const isOwn = isOwnMessage || message.senderId === user?.id
      const isBot = message.sender?.isBot === true || message.senderId === 'securebot-system' || senderName === 'SecureBot'

      // Special styling for bot messages
      if (isBot) {
        return (
          <div ref={ref} className={cn('group relative flex gap-2 px-4 py-0.5', isConsecutive ? 'pt-0.5' : 'pt-1.5')}>
            <div className="flex-shrink-0 w-8 pt-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm ring-2 ring-violet-200 dark:ring-violet-900/50">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="max-w-[75%] min-w-0">
              {showAvatar && (
                <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">SecureBot</span>
                  <Bot className="h-3 w-3 text-violet-500" />
                </div>
              )}
              <div className="relative">
                <div className={cn(
                  'rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm',
                  'bg-gradient-to-br from-violet-50/40 to-indigo-50/40 dark:from-violet-950/15 dark:to-indigo-950/15',
                  'border border-violet-200/30 dark:border-violet-900/20'
                )}>
                  <div className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                    {message.content}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-end text-muted-foreground">
                    {message.isEdited && <span className="text-[10px] italic">đã chỉnh sửa</span>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] leading-none cursor-default">{formatTime(message.createdAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{formatRelativeTime(message.createdAt)}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      // Bubble corner rounding based on consecutive grouping
      const bubbleRadius = isOwn
        ? cn(
            'rounded-2xl',
            isConsecutive
              ? 'rounded-tr-md'
              : 'rounded-tr-md',
            // First in group: larger top-right radius
            !isConsecutive ? 'rounded-tr-sm' : 'rounded-tr-sm'
          )
        : cn(
            'rounded-2xl',
            isConsecutive
              ? 'rounded-tl-md'
              : 'rounded-tl-md',
            !isConsecutive ? 'rounded-tl-sm' : 'rounded-tl-sm'
          )

      return (
        <div
          ref={ref}
          className={cn(
            'group relative flex gap-2 px-4 py-0.5',
            isOwn ? 'justify-end' : 'justify-start',
            isConsecutive ? 'pt-0.5' : 'pt-1.5'
          )}
        >
          {/* Avatar — only for OTHER messages, and only on first message */}
          {!isOwn && (
            <div className="flex-shrink-0 w-8 pt-0.5">
              {showAvatar ? (
                <UserAvatar
                  name={senderName}
                  avatar={message.sender?.avatar}
                  status={isOnline ? 'online' : 'offline'}
                  size="sm"
                />
              ) : (
                <div className="w-7" />
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div className={cn('max-w-[70%] min-w-0 flex flex-col', isOwn && 'items-end')}>
            {/* Sender name — only for OTHER messages, first in group */}
            {!isOwn && showAvatar && (
              <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                <span className="text-xs font-semibold text-foreground/80">
                  {senderName}
                </span>
                {message.isPinned && (
                  <Pin className="h-3 w-3 text-amber-500" />
                )}
              </div>
            )}

            {/* Bubble wrapper */}
            <div className="relative">
              {/* Bubble */}
              <div
                className={cn(
                  'relative',
                  bubbleRadius,
                  'px-3.5 py-2 shadow-sm',
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted dark:bg-muted/80 text-foreground rounded-tl-sm'
                )}
              >
                {/* Reply reference — inside bubble */}
                {message.replyTo && (
                  <div className={cn(
                    'mb-1.5 rounded-md px-2.5 py-1.5 border-l-2 border-current/30',
                    isOwn
                      ? 'bg-white/15 border-white/30'
                      : 'bg-primary/5 border-primary/30 dark:bg-primary/10'
                  )}>
                    <div className={cn(
                      'text-[11px] font-semibold',
                      isOwn ? 'text-primary-foreground/80' : 'text-primary dark:text-primary/80'
                    )}>
                      {message.replyTo.sender?.name}
                    </div>
                    <div className={cn(
                      'text-xs truncate',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {message.replyTo.content?.substring(0, 80) || '(tệp đính kèm)'}
                    </div>
                  </div>
                )}

                {/* Message body */}
                <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* File attachment — inside bubble */}
                {message.fileUrl && (
                  <div className={cn(
                    'mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2',
                    isOwn
                      ? 'bg-white/15'
                      : 'bg-muted/80 dark:bg-muted/60'
                  )}>
                    <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{message.fileName || 'Tệp đính kèm'}</div>
                      {message.fileSize && (
                        <div className="text-[11px] opacity-70">
                          {formatFileSize(message.fileSize)}
                        </div>
                      )}
                    </div>
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                        isOwn
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-primary/10 hover:bg-primary/20 text-primary'
                      )}
                    >
                      Tải xuống
                    </a>
                  </div>
                )}

                {/* Timestamp + edited indicator */}
                <div className={cn(
                  'flex items-center gap-1.5 mt-0.5 justify-end',
                  isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                )}>
                  {message.isEdited && (
                    <span className="text-[10px] italic">đã chỉnh sửa</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] leading-none cursor-default">
                        {formatTime(message.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {formatRelativeTime(message.createdAt)}
                    </TooltipContent>
                  </Tooltip>
                  {message.isPinned && (
                    <Pin className="h-2.5 w-2.5 text-amber-400 dark:text-amber-500" />
                  )}
                </div>
              </div>

              {/* Reply count indicator — only shown if replies exist via metadata */}
              {(message as unknown as Record<string, unknown>)?.replies && Array.isArray((message as unknown as Record<string, unknown>).replies) && ((message as unknown as Record<string, unknown>).replies as unknown[]).length > 0 && (
                <button
                  onClick={() => onThread?.(message)}
                  className={cn(
                    'mt-0.5 flex items-center gap-1 text-xs transition-colors px-1 rounded-md',
                    isOwn
                      ? 'text-primary-foreground/60 hover:text-primary-foreground/80'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CornerDownRight className="h-3 w-3" />
                  {((message as unknown as Record<string, unknown>).replies as unknown[]).length} phản hồi
                </button>
              )}

              {/* Hover actions */}
              {!isSystem && (
                <div className={cn(
                  'absolute -top-3 hidden items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-md group-hover:flex z-10',
                  isOwn ? 'right-0' : 'left-0'
                )}>
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

          {/* Own message avatar — small, on the right, only first in group */}
          {isOwn && showAvatar && (
            <div className="flex-shrink-0 w-8 pt-0.5">
              <UserAvatar
                name={user?.name || 'Bạn'}
                avatar={user?.avatar}
                size="sm"
              />
            </div>
          )}
          {isOwn && !showAvatar && (
            <div className="w-8 flex-shrink-0" />
          )}
        </div>
      )
    }
  )
)
