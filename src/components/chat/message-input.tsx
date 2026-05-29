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
    <div className="bg-[#0d1117] border-t border-[#1e2d3d] px-4 py-3 relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border border-[#1e2d3d] bg-[#111820] rounded-[6px] p-2 mb-2 max-w-5xl mx-auto">
          <div className="border-l-2 border-l-[#00d68f] pl-3 flex-1 min-w-0">
            <div className="text-xs font-rajdhani font-semibold text-[#00d68f] uppercase tracking-wider">
              Phản hồi {replyTo.sender?.name}
            </div>
            <div className="text-xs truncate text-[#4d6b80] font-dm mt-0.5">
              {replyTo.content?.substring(0, 100)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-[4px] hover:bg-[#161f2a] text-[#4d6b80] hover:text-[#d06363] cursor-pointer"
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
            <span className="h-1 w-1 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_4px_#00d68f]" style={{ animationDelay: '0ms' }} />
            <span className="h-1 w-1 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_4px_#00d68f]" style={{ animationDelay: '150ms' }} />
            <span className="h-1 w-1 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_4px_#00d68f]" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] font-mono-jb text-[#4d6b80]">
            {typingUsers.length === 1
              ? `${typingUsers[0].name} đang nhập...`
              : `${typingUsers.length} người đang nhập...`}
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2.5 max-w-5xl mx-auto">
        {/* Unified Input Pill Container */}
        <div className="flex-1 flex items-end gap-1 rounded-[10px] border border-[#243448] bg-[#111820] focus-within:bg-[#161f2a] focus-within:border-[#00d68f]/35 focus-within:ring-0 transition-all p-1.5 pl-2 shadow-inner">
          {/* Actions on left (Emoji and File Upload) */}
          <div className="flex gap-0.5 pb-0.5 shrink-0">
            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-[6px] text-[#4d6b80] hover:text-[#dce8f0] hover:bg-[#161f2a] transition-colors cursor-pointer"
                  disabled={disabled}
                  aria-label="Chọn emoji"
                >
                  <Smile className="h-4.5 w-4.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2.5 bg-[#111820] border border-[#1e2d3d] rounded-[8px]" align="start">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      className="flex h-9 w-9 items-center justify-center rounded-[6px] text-lg hover:bg-[#161f2a] transition-colors animate-in fade-in duration-100 cursor-pointer"
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
                  className="h-8 w-8 rounded-[6px] text-[#4d6b80] hover:text-[#dce8f0] hover:bg-[#161f2a] transition-colors cursor-pointer"
                  disabled={disabled}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  aria-label="Đính kèm tệp"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#111820] border border-[#1e2d3d] font-mono-jb text-[9px] text-[#dce8f0]">Tệp đính kèm (tối đa 10MB)</TooltipContent>
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
                  const { getAccessToken } = await import('@/lib/api')
                  const token = getAccessToken()
                  const headers: Record<string, string> = {}
                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                  }
                  const uploadRes = await fetch('/api/v1/upload', {
                    method: 'POST',
                    headers,
                    body: formData,
                  })
                  if (!uploadRes.ok) throw new Error('Upload failed')
                  const json = await uploadRes.json() as { data: { url: string } }
                  const fileData = json.data
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
              maxLength={4000}
              disabled={disabled || isSending}
              className="min-h-[36px] max-h-[150px] resize-none border-0 bg-transparent px-2.5 py-2 text-sm text-[#dce8f0] font-dm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#4d6b80]/60 w-full focus-visible:outline-none"
              rows={1}
            />
          </div>
        </div>

        {/* Send Button on Right */}
        <Button
          size="icon"
          className={cn(
            'h-10 w-10 shrink-0 transition-all duration-200 mb-0.5 rounded-[6px] cursor-pointer',
            hasContent && !disabled
              ? 'bg-[#00d68f] hover:bg-[#00a86b] text-black shadow-md shadow-[#00d68f]/20 hover:scale-105 active:scale-95 border-0'
              : 'bg-[#111820] text-[#4d6b80] border border-[#1e2d3d] disabled:opacity-40'
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

      {/* Encryption & Character counter status row */}
      <div className="flex items-center justify-between mt-2 max-w-5xl mx-auto px-1">
        <div className="flex items-center gap-1.5 select-none">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d68f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d68f]"></span>
          </span>
          <span className="text-[9px] font-mono-jb text-[#4d6b80] tracking-wider uppercase">
            E2E ENCRYPTED · AES-256
          </span>
        </div>
        <div className="text-[9px] font-mono-jb text-[#4d6b80]/60">
          {content.length} / 4000
        </div>
      </div>
    </div>
  )
}
