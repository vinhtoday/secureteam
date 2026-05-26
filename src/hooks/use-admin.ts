'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AdminDashboard {
  totalUsers: number
  onlineUsers: number
  messagesToday: number
  activeChannels: number
  chartData: { date: string; messages: number }[]
  recentActivity: {
    id: string
    userId: string
    action: string
    target?: string | null
    createdAt: string
    user: { id: string; name: string }
  }[]
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<AdminDashboard>('/api/v1/admin/dashboard')
      return res.data
    },
  })
}

export interface AdminUser {
  id: string
  email: string
  name: string
  avatar?: string | null
  isActive: boolean
  isLocked: boolean
  onlineStatus: string
  createdAt: string
  role: {
    id: string
    name: string
  }
}

interface UserListParams {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
}

export function useAdminUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.role) searchParams.set('role', params.role)
      if (params.status) searchParams.set('status', params.status)
      const res = await api.get<AdminUser[]>(
        `/api/v1/users?${searchParams.toString()}`
      )
      return res
    },
  })
}

export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  target?: string | null
  details?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  user: {
    id: string
    name: string
  }
}

interface AuditLogParams {
  page?: number
  limit?: number
  userId?: string
  action?: string
  dateRange?: string
}

export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.userId) searchParams.set('userId', params.userId)
      if (params.action) searchParams.set('action', params.action)
      if (params.dateRange) searchParams.set('dateRange', params.dateRange)
      const res = await api.get<AuditLogEntry[]>(
        `/api/v1/admin/audit-logs?${searchParams.toString()}`
      )
      return res
    },
  })
}

export interface AdminMessage {
  id: string
  content?: string | null
  contentType: string
  createdAt: string
  channelId: string
  senderId: string
  sender: {
    id: string
    name: string
  }
  channel: {
    id: string
    name: string
  }
}

interface AdminMessagesParams {
  userId?: string
  channelId?: string
  search?: string
  page?: number
  limit?: number
}

export function useAdminMessages(params: AdminMessagesParams = {}) {
  return useQuery({
    queryKey: ['admin', 'messages', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.userId) searchParams.set('userId', params.userId)
      if (params.channelId) searchParams.set('channelId', params.channelId)
      if (params.search) searchParams.set('search', params.search)
      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      const res = await api.get<AdminMessage[]>(
        `/api/v1/admin/messages?${searchParams.toString()}`
      )
      return res
    },
  })
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name?: string
      email?: string
      roleId?: string
      isActive?: boolean
      isLocked?: boolean
    }) => {
      const res = await api.patch(`/api/v1/users/${userId}`, data)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/api/v1/users/${userId}`)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useExportData() {
  return useMutation({
    mutationFn: async (data: { type: string; filters?: Record<string, unknown> }) => {
      const res = await api.post('/api/v1/admin/export', data)
      return res
    },
  })
}
