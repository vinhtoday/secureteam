'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/stores/auth-store'

export interface Message {
  id: string
  channelId: string
  senderId: string
  content?: string | null
  contentType: string
  replyToId?: string | null
  isPinned: boolean
  isEdited: boolean
  editedAt?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  fileMimeType?: string | null
  metadata?: string | null
  createdAt: string
  updatedAt: string
  sender?: {
    id: string
    name: string
    avatar?: string | null
    isBot?: boolean
  }
  replyTo?: Message
}

interface MessagesResponse {
  data: Message[]
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (pageParam) params.set('before', pageParam)
      const res = await api.get<Message[]>(
        `/api/v1/channels/${channelId}/messages?${params.toString()}`
      )
      return res.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined
      return lastPage[lastPage.length - 1]?.createdAt
    },
    enabled: !!channelId,
  })
}

export function useSendMessage(channelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      content: string
      contentType?: string
      replyToId?: string
    }) => {
      const res = await api.post<Message>(
        `/api/v1/channels/${channelId}/messages`,
        data
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}
