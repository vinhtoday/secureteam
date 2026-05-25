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
  '👋', '🤝', '✌️', '👋', '🎯', '📌', '📎', '💬', '📱', '💻',
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

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

  return (
    <div className="border-t bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30">
          <div className="border-l-2 border-emerald-500 pl-2 flex-1 min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              Phản hồi {replyTo.sender?.name}
            </div>
            <div className="text-xs truncate text-muted-foreground/80">
              {replyTo.content?.substring(0, 100)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
            aria-label="Hủy phản hồi"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground">
          {typingUsers.length === 1
            ? `${typingUsers[0].name} đang nhập...`
            : `${typingUsers.length} người đang nhập...`}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex gap-1">
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                disabled={disabled}
                aria-label="Chọn emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted transition-colors"
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
                className="h-9 w-9 text-muted-foreground"
                disabled
                aria-label="Đính kèm tệp"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tệp đính kèm (tối đa 10MB)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[40px] max-h-[150px] resize-none rounded-xl pr-10 text-sm"
            rows={1}
          />
        </div>

        <Button
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0 disabled:opacity-40"
          disabled={!content.trim() || isSending || disabled}
          onClick={handleSend}
          aria-label="Gửi tin nhắn"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
