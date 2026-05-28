'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Channel {
  id: string
  name: string
  description?: string | null
  type: 'public' | 'private' | 'direct'
  avatar?: string | null
  createdAt: string
  updatedAt: string
  owner?: { id: string; name: string; avatar?: string | null } | null
  memberCount: number
  messageCount: number
  lastMessage?: {
    id: string
    content?: string | null
    createdAt: string
    sender: { id: string; name: string; avatar?: string | null }
  } | null
  members?: { userId: string }[]
}

export interface ChannelDetail extends Channel {
  members?: ChannelMember[]
}

export interface ChannelMember {
  userId: string
  channelId: string
  role: string
  joinedAt: string
  muted: boolean
  user?: {
    id: string
    name: string
    email: string
    avatar?: string | null
    onlineStatus: string
    isBot?: boolean
  }
}

export function useChannels(type?: string, search?: string) {
  return useQuery({
    queryKey: ['channels', type, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (search) params.set('search', search)
      const res = await api.get<Channel[]>(`/api/v1/channels?${params.toString()}`)
      return res.data
    },
  })
}

export function useChannel(id: string | null) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: async () => {
      const res = await api.get<ChannelDetail>(`/api/v1/channels/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      type: 'public' | 'private'
      memberIds?: string[]
    }) => {
      const res = await api.post<Channel>('/api/v1/channels', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useAddChannelMember(channelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { userId: string; role?: string }) => {
      const res = await api.post(`/api/v1/channels/${channelId}/members`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useRemoveChannelMember(channelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/api/v1/channels/${channelId}/members/${userId}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useCreateDirectMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post<Channel>('/api/v1/channels/direct', { userId })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useUpdateChannel(channelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name?: string; description?: string }) => {
      const res = await api.patch<Channel>(`/api/v1/channels/${channelId}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useDeleteChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (channelId: string) => {
      const res = await api.delete(`/api/v1/channels/${channelId}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}
