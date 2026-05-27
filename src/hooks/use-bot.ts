// useBot - Hook for interacting with SecureBot

'use client'

import { useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSendMessage } from '@/hooks/use-messages'
import { useSocket } from '@/hooks/use-socket'
import { toast } from 'sonner'

export interface BotConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BotResponse {
  content: string
  toolCalls?: Array<{
    name: string
    args: Record<string, unknown>
    result: unknown
  }>
  message?: {
    id: string
    content: string
    contentType: string
    createdAt: string
    sender: {
      id: string
      name: string
      avatar: string | null
    }
  }
}

export function useBot(channelId: string | null) {
  const [isThinking, setIsThinking] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<BotConversationMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const { sendMessage: sendSocketMessage } = useSocket()
  const sendMessageMutation = useSendMessage(channelId || '')
  const isProcessingRef = useRef(false)

  /**
   * Check if a message should trigger the bot
   */
  const shouldTriggerBot = useCallback((content: string, isBotChannel: boolean): boolean => {
    const lower = content.toLowerCase().trim()
    return (
      isBotChannel ||
      lower.includes('@securebot') ||
      lower.includes('@secure_bot')
    )
  }, [])

  /**
   * Send a message to SecureBot
   */
  const chatWithBot = useCallback(
    async (content: string): Promise<BotResponse | null> => {
      if (!content.trim() || !channelId || !user || isProcessingRef.current) return null

      isProcessingRef.current = true
      setIsThinking(true)
      setError(null)

      // Add user message to history
      const userMsg: BotConversationMessage = { role: 'user', content }
      setConversationHistory((prev) => [...prev, userMsg])

      try {
        const res = await api.post<BotResponse>('/api/v1/bot/chat', {
          message: content,
          channelId,
          conversationHistory,
        })

        const botResponse = res.data

        // Add bot response to history
        const assistantMsg: BotConversationMessage = {
          role: 'assistant',
          content: botResponse.content,
        }
        setConversationHistory((prev) => [...prev, assistantMsg])

        // If bot response includes a saved message, broadcast it via socket
        if (botResponse.message && user) {
          sendSocketMessage({
            channelId,
            message: {
              id: botResponse.message.id,
              content: botResponse.message.content,
              contentType: 'text',
              senderId: botResponse.message.sender.id,
              senderName: botResponse.message.sender.name,
              createdAt: botResponse.message.createdAt,
            },
          })
        }

        setIsThinking(false)
        isProcessingRef.current = false
        return botResponse
      } catch (err) {
        console.error('[SecureBot] Chat error:', err)
        setError('Không thể kết nối với SecureBot. Vui lòng thử lại.')
        toast.error('SecureBot đang gặp sự cố')
        setIsThinking(false)
        isProcessingRef.current = false
        return null
      }
    },
    [channelId, user, conversationHistory, sendSocketMessage]
  )

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setConversationHistory([])
    setError(null)
  }, [])

  return {
    isThinking,
    error,
    conversationHistory,
    chatWithBot,
    shouldTriggerBot,
    clearHistory,
  }
}
