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
          <div ref={ref} className="flex justify-center py-2 px-4">
            <div className="border border-[#1e2d3d] bg-[#111820] px-4 py-1 font-mono-jb text-[9px] text-[#4d6b80] tracking-wider uppercase rounded-[4px]">
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
      const isMood = message.contentType === 'mood'

      // Special styling for bot messages (tactical dashboard panel style)
      if (isBot) {
        return (
          <div ref={ref} className={cn('group relative flex gap-2 px-4 py-0.5', isConsecutive ? 'pt-0.5' : 'pt-2')}>
            <div className="flex-shrink-0 w-8 pt-0.5">
              <div 
                className="flex h-7 w-7 items-center justify-center bg-[#111820] text-[#00d68f] border border-[#1e2d3d] transition-transform group-hover:scale-105 duration-200"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <Bot className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="max-w-[75%] min-w-0">
              {showAvatar && (
                <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                  <span className="text-[10px] font-rajdhani font-semibold text-[#00d68f] uppercase tracking-wider">SecureBot</span>
                  <span className="rounded-[4px] bg-[#00d68f]/14 px-1 py-0.5 text-[9px] font-mono-jb font-bold text-[#00d68f] border border-[#00d68f]/25 uppercase">AI</span>
                </div>
              )}
              <div className="relative">
                <div className="bg-[#111820] border-l-[3px] border-l-[#00d68f] border-t border-b border-r border-[#1e2d3d] rounded-[8px] px-3.5 py-2">
                  <div className="text-xs font-mono-jb leading-relaxed break-words whitespace-pre-wrap text-[#dce8f0]">
                    {message.content}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 justify-end text-[#4d6b80]/60">
                    {message.isEdited && <span className="text-[9px] font-mono-jb uppercase tracking-wider">EDITED</span>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[9px] font-mono-jb leading-none cursor-default">{formatTime(message.createdAt)}</span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#111820] border border-[#1e2d3d] font-mono-jb text-[10px] text-[#dce8f0]">{formatRelativeTime(message.createdAt)}</TooltipContent>
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
      const bubbleRadius = isMood
        ? 'bg-[rgba(208,99,99,0.08)] border border-[rgba(208,99,99,0.2)] rounded-[8px] text-[#d06363] italic font-dm leading-[1.65] text-[13px]'
        : isOwn
          ? 'bg-[#161f2a] border-r-[3px] border-r-[#00d68f] border-t border-b border-l border-[#1e2d3d] rounded-[8px] text-[#dce8f0]'
          : 'bg-[#111820] border-l-[3px] border-l-[#1e2d3d] border-t border-b border-r border-[#1e2d3d] rounded-[8px] text-[#dce8f0]'

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
                <div className="w-8" />
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div className={cn('max-w-[70%] min-w-0 flex flex-col', isOwn && 'items-end')}>
            {/* Sender name — only for OTHER messages, first in group */}
            {!isOwn && showAvatar && (
              <div className="mb-0.5 flex items-center gap-1.5 pl-1 items-baseline">
                <span className="text-[14px] font-dm font-semibold text-[#dce8f0]">
                  {senderName}
                </span>
                <span className="text-[10px] font-mono-jb text-[#4d6b80] ml-1.5">
                  {formatTime(message.createdAt)}
                </span>
                {message.isPinned && (
                  <Pin className="h-3 w-3 text-amber-500 ml-1.5" />
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
                  <div className="mb-1.5 rounded-[4px] border-l-2 border-l-[#00d68f] bg-[#0d1117] p-1.5 border-t border-r border-b border-[#1e2d3d]">
                    <div className="text-[9px] font-rajdhani font-bold text-[#00d68f] uppercase tracking-wider">
                      {message.replyTo.sender?.name.toUpperCase()}
                    </div>
                    <div className="text-[10px] font-mono-jb text-[#4d6b80] truncate max-w-[300px]">
                      {message.replyTo.content?.substring(0, 80) || '(tệp đính kèm)'}
                    </div>
                  </div>
                )}

                {/* Message body */}
                <div className={cn(
                  'text-[13px] leading-[1.65] break-words whitespace-pre-wrap font-dm',
                  isMood ? 'text-[#d06363] italic' : 'text-[#dce8f0]'
                )}>
                  {message.content}
                </div>

                {/* File attachment — inside bubble */}
                {message.fileUrl && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-[6px] border border-[#1e2d3d] bg-[#0d1117] p-2 hover:border-[#00d68f]/40 transition-colors">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[#00d68f]/70" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-dm font-bold truncate text-[#dce8f0] uppercase">{message.fileName || 'ATTACHMENT'}</div>
                      {message.fileSize && (
                        <div className="text-[9px] font-mono-jb text-[#4d6b80] mt-0.5">
                          {formatFileSize(message.fileSize)}
                        </div>
                      )}
                    </div>
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-[6px] bg-[#00d68f] text-black font-rajdhani text-[11px] hover:bg-[#00a86b] px-3 py-1.5 font-bold uppercase transition-all duration-150 cursor-pointer"
                    >
                      DOWNLOAD
                    </a>
                  </div>
                )}

                {/* Timestamp + edited indicator */}
                <div className={cn(
                  'flex items-center gap-1.5 mt-1 justify-end text-[#4d6b80]/50'
                )}>
                  {message.isEdited && (
                    <span className="text-[9px] font-mono-jb uppercase tracking-wider">EDITED</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[9px] font-mono-jb leading-none cursor-default">
                        {formatTime(message.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#111820] border border-[#1e2d3d] font-mono-jb text-[10px] text-[#dce8f0]">
                      {formatRelativeTime(message.createdAt)}
                    </TooltipContent>
                  </Tooltip>
                  {message.isPinned && (
                    <Pin className="h-2.5 w-2.5 text-amber-500" />
                  )}
                  {isOwn && (
                    <span className="text-[9px] font-mono-jb text-[#00d68f] font-bold ml-0.5 select-none" title="Đã nhận">✓✓</span>
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
                          'flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 text-[9px] font-mono-jb border shadow-sm transition-all hover:scale-105 active:scale-95 duration-150 cursor-pointer',
                          hasReacted
                            ? 'bg-[#00d68f]/14 border-[#00d68f]/30 text-[#00d68f] font-bold'
                            : 'bg-[#111820] border-[#1e2d3d] hover:bg-[#161f2a] text-[#4d6b80]'
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
                  className="mt-1.5 flex items-center gap-1 text-[9px] font-mono-jb font-bold tracking-wider text-[#00d68f] hover:text-[#00a86b] transition-colors uppercase cursor-pointer"
                >
                  <CornerDownRight className="h-3 w-3" />
                  {((message as any).replies as any[]).length} TRANSMISSION REPLIES
                </button>
              )}

              {/* Hover actions & Reactions bar */}
              {!isSystem && (
                <div className={cn(
                  'absolute -top-9 hidden items-center gap-1 border border-[#1e2d3d] bg-[#111820] px-2.5 py-1 shadow-xl group-hover:flex z-20 animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-[6px]',
                  isOwn ? 'right-2' : 'left-2'
                )}>
                  {/* Emoji Quick Actions */}
                  <div className="flex items-center gap-1.5 pr-1.5 border-r border-[#1e2d3d]">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                      const userHasReacted = reactions[emoji]?.includes(user?.id || '')
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(emoji)}
                          className={cn(
                            'text-sm p-0.5 rounded-[4px] hover:scale-125 active:scale-95 transition-all duration-100 cursor-pointer',
                            userHasReacted && 'bg-[#00d68f]/15'
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
                          className="h-6 w-6 rounded-[4px] text-[#dce8f0] hover:bg-[#161f2a] cursor-pointer"
                          onClick={() => onReply?.(message)}
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#111820] border border-[#1e2d3d] font-mono-jb text-[9px] text-[#dce8f0]">REPLY</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-[4px] text-[#d06363] hover:text-[#d06363] hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#111820] border border-[#1e2d3d] font-mono-jb text-[9px] text-[#dce8f0]">DELETE TRANSMISSION</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-52 bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-1">
                        {(isOwn || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN') && (
                          <DropdownMenuItem
                            onClick={() => onDelete?.(message, 'recall')}
                            className="text-[#d06363] focus:text-[#d06363] text-[10px] font-mono-jb font-bold uppercase rounded-[6px] hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            RECALL (FOR ALL)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDelete?.(message, 'me')}
                          className="text-[#dce8f0] text-[10px] font-mono-jb font-bold uppercase rounded-[6px] hover:bg-[#161f2a] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2 text-[#4d6b80]" />
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

