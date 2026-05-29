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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  onDelete?: (message: Message, mode: 'recall' | 'me') => void
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
          <div ref={ref} className="flex justify-center py-2.5 px-4">
            <div className="border border-[#1e2a35]/60 bg-[#0a0c0f]/80 px-4 py-1 font-mono text-[9px] text-muted-foreground/80 tracking-wider uppercase rounded-none">
              // SYSTEM: {message.content}
            </div>
          </div>
        )
      }

      const isOnline = onlineUsers?.includes(message.senderId || '')
      const showAvatar = !isConsecutive
      const senderName = message.sender?.name || 'Người dùng'
      const isOwn = isOwnMessage || message.senderId === user?.id
      const isBot = message.sender?.isBot === true || message.senderId === 'securebot-system' || senderName === 'SecureBot'

      // Special styling for bot messages (tactical dashboard panel style)
      if (isBot) {
        return (
          <div ref={ref} className={cn('group relative flex gap-2 px-4 py-0.5', isConsecutive ? 'pt-0.5' : 'pt-2')}>
            <div className="flex-shrink-0 w-8 pt-0.5">
              <div 
                className="flex h-7 w-7 items-center justify-center bg-[#0a0c0f] text-[#00e5a0] border border-[#1e2a35] transition-transform hover:scale-105 duration-200"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <Bot className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="max-w-[75%] min-w-0">
              {showAvatar && (
                <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                  <span className="text-[10px] font-mono font-bold text-[#00e5a0] uppercase tracking-wider">SecureBot</span>
                  <span className="rounded-none bg-[#00e5a0]/15 px-1 py-0.5 text-[8px] font-mono font-bold text-[#00e5a0] border border-[#00e5a0]/30 uppercase">AI</span>
                </div>
              )}
              <div className="relative">
                <div className="bg-[#0f1318] border-l-[3px] border-[#00e5a0] border-t border-b border-r border-[#1e2a35] rounded-none px-3.5 py-2">
                  <div className="text-xs font-mono leading-relaxed break-words whitespace-pre-wrap text-white">
                    {message.content}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 justify-end text-muted-foreground/60">
                    {message.isEdited && <span className="text-[9px] font-mono uppercase tracking-wider">EDITED</span>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[9px] font-mono leading-none cursor-default">{formatTime(message.createdAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#0f1318] border border-[#1e2a35] font-mono text-[10px] text-white">{formatRelativeTime(message.createdAt)}</TooltipContent>
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

      // Bubble corner rounding based on consecutive grouping (Messenger style) -> Flat sharp panels
      const bubbleRadius = isOwn
        ? 'bg-[#141920] border-r-[3px] border-[#00e5a0] border-t border-b border-l border-[#1e2a35] rounded-none text-white'
        : 'bg-[#0f1318] border-l-[3px] border-[#1e2a35] border-t border-b border-r border-[#1e2a35] rounded-none text-white'

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
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
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
                  'px-4 py-2.5 shadow-sm transition-all duration-200'
                )}
              >
                {/* Reply reference — inside bubble */}
                {message.replyTo && (
                  <div className="mb-1.5 rounded-none border-l-2 border-[#00e5a0] bg-[#0a0c0f] p-1.5">
                    <div className="text-[9px] font-mono font-bold text-[#00e5a0] uppercase tracking-wider">
                      {message.replyTo.sender?.name.toUpperCase()}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[300px]">
                      {message.replyTo.content?.substring(0, 80) || '(tệp đính kèm)'}
                    </div>
                  </div>
                )}

                {/* Message body */}
                <div className="text-xs font-mono leading-relaxed break-words whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* File attachment — inside bubble */}
                {message.fileUrl && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-none border border-[#1e2a35] bg-[#0a0c0f] p-2 hover:border-[#00e5a0]/40 transition-colors">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[#00e5a0]/70" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono font-bold truncate text-white uppercase">{message.fileName || 'ATTACHMENT'}</div>
                      {message.fileSize && (
                        <div className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">
                          {formatFileSize(message.fileSize)}
                        </div>
                      )}
                    </div>
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-none bg-[#00e5a0] text-black font-mono text-[9px] hover:bg-[#00c78b] p-1.5 font-bold uppercase transition-all duration-150 cursor-pointer"
                    >
                      DOWNLOAD
                    </a>
                  </div>
                )}

                {/* Timestamp + edited indicator */}
                <div className={cn(
                  'flex items-center gap-1.5 mt-1 justify-end text-muted-foreground/50'
                )}>
                  {message.isEdited && (
                    <span className="text-[9px] font-mono uppercase tracking-wider">EDITED</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[9px] font-mono leading-none cursor-default">
                        {formatTime(message.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#0f1318] border border-[#1e2a35] font-mono text-[10px] text-white">
                      {formatRelativeTime(message.createdAt)}
                    </TooltipContent>
                  </Tooltip>
                  {message.isPinned && (
                    <Pin className="h-2.5 w-2.5 text-amber-500" />
                  )}
                  {isOwn && (
                    <span className="text-[9px] font-mono text-[#00e5a0] font-bold ml-0.5 select-none" title="Đã nhận">✓✓</span>
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
                          'flex items-center gap-1.5 rounded-none px-2 py-0.5 text-[9px] font-mono border shadow-sm transition-all hover:scale-105 active:scale-95 duration-150 cursor-pointer',
                          hasReacted
                            ? 'bg-[#00e5a0]/8 border-[#00e5a0] text-[#00e5a0] font-bold'
                            : 'bg-[#0a0c0f] border-[#1e2a35] hover:bg-[#1e2a35] text-muted-foreground'
                        )}
                        title={`${userIds.length} phản hồi`}
                      >
                        <span className="text-[10px]">{emoji}</span>
                        <span>{userIds.length}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Reply count indicator — only shown if replies exist via metadata */}
              {Array.isArray((message as any).replies) && ((message as any).replies as any[]).length > 0 && (
                <button
                  onClick={() => onThread?.(message)}
                  className="mt-1.5 flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider text-[#00e5a0] hover:text-[#00c78b] transition-colors uppercase cursor-pointer"
                >
                  <CornerDownRight className="h-3 w-3" />
                  {((message as any).replies as any[]).length} TRANSMISSION REPLIES
                </button>
              )}

              {/* Hover actions & Reactions bar */}
              {!isSystem && (
                <div className={cn(
                  'absolute -top-9 hidden items-center gap-1 border border-[#1e2a35] bg-[#0f1318] px-2.5 py-1 shadow-xl group-hover:flex z-20 animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-none',
                  isOwn ? 'right-2' : 'left-2'
                )}>
                  {/* Emoji Quick Actions */}
                  <div className="flex items-center gap-1.5 pr-1.5 border-r border-[#1e2a35]">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                      const userHasReacted = reactions[emoji]?.includes(user?.id || '')
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(emoji)}
                          className={cn(
                            'text-sm p-0.5 rounded-none hover:scale-125 active:scale-95 transition-all duration-100 cursor-pointer',
                            userHasReacted && 'bg-[#00e5a0]/15'
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
                          className="h-6 w-6 rounded-none text-white hover:bg-[#1e2a35] cursor-pointer"
                          onClick={() => onReply?.(message)}
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#0f1318] border border-[#1e2a35] font-mono text-[9px] text-white">REPLY</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-none text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#0f1318] border border-[#1e2a35] font-mono text-[9px] text-white">DELETE TRANSMISSION</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-52 bg-[#0f1318] border border-[#1e2a35] rounded-none p-1">
                        {(isOwn || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN') && (
                          <DropdownMenuItem
                            onClick={() => onDelete?.(message, 'recall')}
                            className="text-destructive focus:text-destructive text-[10px] font-mono font-bold uppercase rounded-none hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            RECALL (FOR ALL)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDelete?.(message, 'me')}
                          className="text-white text-[10px] font-mono font-bold uppercase rounded-none hover:bg-[#1e2a35] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          DELETE (FOR ME)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

