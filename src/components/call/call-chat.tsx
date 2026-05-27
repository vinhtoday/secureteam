'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
}

interface CallChatProps {
  channelId: string
  onClose: () => void
}

export function CallChat({ channelId, onClose }: CallChatProps) {
  const [messages, setMessages] = useState<CallChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Simulated messages for the call
  const addMessage = useCallback((content: string) => {
    const newMsg: CallChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'self',
      senderName: 'Bạn',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMsg])
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    addMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="w-72 md:w-80 border-l border-white/10 bg-gray-900/95 backdrop-blur-xl flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white">Tin nhắn cuộc gọi</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 mb-3">
                <Send className="h-5 w-5 text-white/30" />
              </div>
              <p className="text-xs text-white/40">
                Chưa có tin nhắn nào
              </p>
              <p className="text-[11px] text-white/25 mt-1">
                Gửi tin nhắn trong cuộc gọi
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white/80">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-white/70 mt-0.5 break-words">
                  {msg.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <Button
            size="icon"
            className={cn(
              'h-8 w-8 rounded-xl shrink-0 transition-all duration-200',
              input.trim()
                ? 'bg-violet-500 hover:bg-violet-600 text-white'
                : 'bg-white/5 text-white/30'
            )}
            disabled={!input.trim()}
            onClick={handleSend}
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
