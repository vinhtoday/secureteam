'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface Notification {
  id: string
  recipientId: string
  senderId?: string
  sender?: { id: string; name: string; avatar?: string }
  type: string
  title: string
  body?: string
  link?: string
  isRead: boolean
  readAt?: string
  metadata?: string
  createdAt: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

// ============================================
// Hooks
// ============================================

/**
 * Get notifications for the current user with unread count
 */
export function useNotifications(params?: {
  page?: number
  limit?: number
  type?: string
  unreadOnly?: boolean
}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.type) searchParams.set('type', params.type)
      if (params?.unreadOnly) searchParams.set('unreadOnly', 'true')
      const res = await api.get<NotificationsResponse>(
        `/api/v1/notifications?${searchParams.toString()}`
      )
      return res
    },
  })
}

/**
 * Mark a single notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await api.patch<Notification>(
        `/api/v1/notifications/${notificationId}/read`
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ markedCount: number }>(
        '/api/v1/notifications/read-all'
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
