'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Smile, Paperclip, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/hooks/use-messages'

interface MessageInputProps {
  onSend: (content: string, contentType?: string, replyToId?: string) => Promise<void>
  onTyping?: () => void
  onStopTyping?: () => void
  replyTo?: Message | null
  onCancelReply?: () => void
  disabled?: boolean
  placeholder?: string
  typingUsers?: { userId: string; name: string }[]
}

const EMOJI_LIST = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😜', '🤔', '😏',
  '😅', '😢', '😭', '😤', '🥺', '😱', '🤯', '😴', '🤗', '👍',
  '👎', '❤️', '🔥', '💯', '🎉', '✅', '⭐', '🚀', '💪', '🙏',
  '👋', '🤝', '✌️', '🎯', '📌', '📎', '💬', '📱', '💻', '🔗',
]

export function MessageInput({
  onSend,
  onTyping,
  onStopTyping,
  replyTo,
  onCancelReply,
  disabled,
  placeholder = 'Nhập tin nhắn...',
  typingUsers = [],
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending || disabled) return

    setIsSending(true)
    try {
      await onSend(
        trimmed,
        'text',
        replyTo?.id
      )
      setContent('')
      setShowEmoji(false)
      onStopTyping?.()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setIsSending(false)
    }
  }, [content, isSending, disabled, onSend, replyTo, onStopTyping])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    onTyping?.()

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }

    // Auto-stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.()
    }, 2000)
  }

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const hasContent = content.trim().length > 0

  return (
    <div className="bg-background/80 backdrop-blur-md border-t border-border/40 px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-2 px-2 max-w-5xl mx-auto">
          <div className="border-l-2 border-violet-500 pl-3 flex-1 min-w-0">
            <div className="text-xs font-semibold text-muted-foreground">
              Phản hồi {replyTo.sender?.name}
            </div>
            <div className="text-xs truncate text-muted-foreground/70 mt-0.5">
              {replyTo.content?.substring(0, 100)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full hover:bg-muted"
            onClick={onCancelReply}
            aria-label="Hủy phản hồi"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Typing indicator with animated dots */}
      {typingUsers.length > 0 && (
        <div className="px-2 pb-1.5 flex items-center gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-0.5">
            <span className="h-1 w-1 rounded-full bg-violet-500/80 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1 w-1 rounded-full bg-violet-500/80 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1 w-1 rounded-full bg-violet-500/80 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-muted-foreground">
            {typingUsers.length === 1
              ? `${typingUsers[0].name} đang nhập...`
              : `${typingUsers.length} người đang nhập...`}
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2.5 max-w-5xl mx-auto">
        {/* Unified Input Pill Container */}
        <div className="flex-1 flex items-end gap-1 rounded-2xl border border-border/50 bg-muted/40 dark:bg-muted/15 focus-within:bg-background focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/50 transition-all p-1.5 pl-2 shadow-inner">
          {/* Actions on left (Emoji and File Upload) */}
          <div className="flex gap-0.5 pb-0.5 shrink-0">
            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  disabled={disabled}
                  aria-label="Chọn emoji"
                >
                  <Smile className="h-4.5 w-4.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2.5" align="start">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-muted transition-colors animate-in fade-in duration-100"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  disabled={disabled}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  aria-label="Đính kèm tệp"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tệp đính kèm (tối đa 10MB)</TooltipContent>
            </Tooltip>
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) {
                  if (typeof window !== 'undefined') {
                    const { toast } = await import('sonner')
                    toast.error('File quá lớn. Tối đa 10MB.')
                  }
                  e.target.value = ''
                  return
                }
                const formData = new FormData()
                formData.append('file', file)
                try {
                  const { api } = await import('@/lib/api')
                  const res = await api.post('/api/v1/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  })
                  const fileData = res.data
                  if (fileData?.url) {
                    onSend(fileData.url, 'file')
                  }
                } catch {
                  if (typeof window !== 'undefined') {
                    const { toast } = await import('sonner')
                    toast.error('Không thể tải lên file.')
                  }
                }
                e.target.value = ''
              }}
            />
          </div>

          {/* Message Textarea */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className="min-h-[36px] max-h-[150px] resize-none border-0 bg-transparent px-2.5 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 w-full focus-visible:outline-none"
              rows={1}
            />
          </div>
        </div>

        {/* Send Button on Right */}
        <Button
          size="icon"
          className={cn(
            'h-10 w-10 rounded-full shrink-0 transition-all duration-200 mb-0.5',
            hasContent && !disabled
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-105 active:scale-95 border-0'
              : 'bg-muted text-muted-foreground disabled:opacity-40'
          )}
          disabled={!hasContent || isSending || disabled}
          onClick={handleSend}
          aria-label="Gửi tin nhắn"
        >
          {isSending ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <Send className="h-4.5 w-4.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
