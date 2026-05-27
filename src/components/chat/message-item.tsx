'use client'

import React, { memo, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './user-status-badge'
import { useAuthStore } from '@/stores/auth-store'
import type { Message } from '@/hooks/use-messages'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
      const queryClient = useQueryClient()

      const handleToggleReaction = async (emoji: string) => {
        try {
          await api.post(`/api/v1/channels/${message.channelId}/messages/${message.id}/react`, { emoji })
          queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] })
        } catch (error) {
          console.error('[Reactions] Failed to toggle reaction:', error)
        }
      }

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

      // Parse reactions from message metadata
      let reactions: Record<string, string[]> = {}
      if (message.metadata) {
        try {
          const meta = JSON.parse(message.metadata)
          if (meta && typeof meta === 'object' && meta.reactions) {
            reactions = meta.reactions
          }
        } catch {
          reactions = {}
        }
      }

      // Bubble corner rounding based on consecutive grouping (Messenger style)
      const bubbleRadius = isOwn
        ? cn(
            'rounded-2xl text-white bg-gradient-to-r from-violet-600 to-indigo-600',
            isConsecutive ? 'rounded-tr-xs rounded-br-xs' : 'rounded-tr-sm'
          )
        : cn(
            'rounded-2xl text-foreground bg-muted dark:bg-muted/80',
            isConsecutive ? 'rounded-tl-xs rounded-bl-xs' : 'rounded-tl-sm'
          )

      return (
        <div
          ref={ref}
          className={cn(
            'group relative flex gap-2 px-4 py-0.5',
            isOwn ? 'justify-end' : 'justify-start',
            isConsecutive ? 'pt-0.5' : 'pt-2'
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
                  'px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md'
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
                      isOwn ? 'text-white/80' : 'text-primary dark:text-primary/80'
                    )}>
                      {message.replyTo.sender?.name}
                    </div>
                    <div className={cn(
                      'text-xs truncate',
                      isOwn ? 'text-white/70' : 'text-muted-foreground'
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
                  'flex items-center gap-1.5 mt-1 justify-end',
                  isOwn ? 'text-white/70' : 'text-muted-foreground'
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
                  {isOwn && (
                    <span className="text-[10px] opacity-75 font-semibold ml-0.5 select-none" title="Đã nhận">✓✓</span>
                  )}
                </div>
              </div>

              {/* Display reaction pills directly under bubble */}
              {Object.keys(reactions).length > 0 && (
                <div className={cn(
                  'flex flex-wrap gap-1 mt-1 z-10 relative',
                  isOwn ? 'justify-end' : 'justify-start'
                )}>
                  {Object.entries(reactions).map(([emoji, userIds]) => {
                    const hasReacted = userIds.includes(user?.id || '')
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(emoji)}
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border shadow-sm transition-all hover:scale-105 active:scale-95 duration-150',
                          hasReacted
                            ? 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold'
                            : 'bg-background border-border hover:bg-muted text-muted-foreground'
                        )}
                        title={`${userIds.length} người thả cảm xúc`}
                      >
                        <span className="text-xs">{emoji}</span>
                        <span>{userIds.length}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Reply count indicator — only shown if replies exist via metadata */}
              {(message as unknown as Record<string, unknown>)?.replies && Array.isArray((message as unknown as Record<string, unknown>).replies) && ((message as unknown as Record<string, unknown>).replies as unknown[]).length > 0 && (
                <button
                  onClick={() => onThread?.(message)}
                  className={cn(
                    'mt-1 flex items-center gap-1 text-xs transition-colors px-1 rounded-md',
                    isOwn
                      ? 'text-white/60 hover:text-white/80'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CornerDownRight className="h-3 w-3" />
                  {((message as unknown as Record<string, unknown>).replies as unknown[]).length} phản hồi
                </button>
              )}

              {/* Hover actions & Reactions bar */}
              {!isSystem && (
                <div className={cn(
                  'absolute -top-9 hidden items-center gap-1 rounded-full border border-violet-100 dark:border-violet-950 bg-background/95 backdrop-blur-md px-2 py-1 shadow-lg group-hover:flex z-20 animate-in fade-in slide-in-from-bottom-1 duration-150',
                  isOwn ? 'right-2' : 'left-2'
                )}>
                  {/* Emoji Quick Actions */}
                  <div className="flex items-center gap-1.5 pr-1.5 border-r border-border/50">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                      const userHasReacted = reactions[emoji]?.includes(user?.id || '')
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(emoji)}
                          className={cn(
                            'text-sm p-1 rounded-full hover:scale-125 active:scale-95 transition-all duration-100',
                            userHasReacted && 'bg-violet-100 dark:bg-violet-900/30'
                          )}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 pl-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-muted"
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
                            className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete?.(message)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Xóa</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
  )
)
